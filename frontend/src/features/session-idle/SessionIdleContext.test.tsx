import {
  act,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import {
  SessionIdleProvider,
} from './SessionIdleContext';

import {
  useSessionIdle,
} from './useSessionIdle';

import {
  ApiError,
} from '@/lib/api/http-client';


const authMocks = vi.hoisted(
  () => ({
    refreshSession:
      vi.fn<
        () => Promise<string>
      >(),

    logout:
      vi.fn<
        () => Promise<void>
      >(),

    recordSessionActivity:
      vi.fn<
        (
          accessToken: string,
        ) => Promise<void>
      >(),
  }),
);


vi.mock(
  '@/features/auth/AuthContext',
  () => ({
    useAuth: () => ({
      status:
        'authenticated' as const,

      accessToken:
        'access-token-1',

      refreshSession:
        authMocks.refreshSession,

      logout:
        authMocks.logout,
    }),
  }),
);


vi.mock(
  '@/features/auth/auth-api',
  () => ({
    recordSessionActivity:
      authMocks.recordSessionActivity,
  }),
);


function Probe() {
  const {
    warningOpen,
    secondsRemaining,
    continuePending,
    continueSession,
    closeSession,
  } = useSessionIdle();

  return (
    <div>
      <span data-testid="warning">
        {warningOpen
          ? 'open'
          : 'closed'}
      </span>

      <span data-testid="remaining">
        {secondsRemaining}
      </span>

      <span data-testid="pending">
        {continuePending
          ? 'pending'
          : 'idle'}
      </span>

      <button
        type="button"
        onClick={() => {
          void continueSession();
        }}
      >
        Continuar
      </button>

      <button
        type="button"
        onClick={() => {
          void closeSession();
        }}
      >
        Cerrar
      </button>
    </div>
  );
}


function renderProvider() {
  return render(
    <SessionIdleProvider>
      <Probe />
    </SessionIdleProvider>,
  );
}


async function advance(
  milliseconds: number,
) {
  await act(
    async () => {
      await vi.advanceTimersByTimeAsync(
        milliseconds,
      );
    },
  );
}


async function flushAsyncWork() {
  await act(
    async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    },
  );
}


describe(
  'SessionIdleProvider',
  () => {
    beforeEach(
      () => {
        vi.useFakeTimers();

        vi.setSystemTime(
          new Date(
            '2026-09-16T08:00:00.000Z',
          ),
        );

        authMocks
          .refreshSession
          .mockReset();

        authMocks
          .logout
          .mockReset();

        authMocks
          .recordSessionActivity
          .mockReset();

        authMocks
          .logout
          .mockResolvedValue();

        authMocks
          .recordSessionActivity
          .mockResolvedValue();

        authMocks
          .refreshSession
          .mockResolvedValue(
            'access-token-2',
          );
      },
    );


    afterEach(
      () => {
        vi.clearAllTimers();

        vi.useRealTimers();
      },
    );


    it(
      'keeps the warning closed before 14 minutes and opens it at 14 minutes',
      async () => {
        renderProvider();

        await advance(
          13 * 60 * 1_000
          + 59 * 1_000,
        );

        expect(
          screen.getByTestId(
            'warning',
          ),
        ).toHaveTextContent(
          'closed',
        );

        await advance(
          1_000,
        );

        expect(
          screen.getByTestId(
            'warning',
          ),
        ).toHaveTextContent(
          'open',
        );

        expect(
          screen.getByTestId(
            'remaining',
          ),
        ).toHaveTextContent(
          '60',
        );
      },
    );


    it(
      'logs out when 15 minutes of inactivity are reached',
      async () => {
        renderProvider();

        await advance(
          15 * 60 * 1_000,
        );

        await flushAsyncWork();

        expect(
          authMocks.logout,
        ).toHaveBeenCalledTimes(
          1,
        );
      },
    );


    it(
      'human activity before the warning resets the local idle clock',
      async () => {
        renderProvider();

        await advance(
          13 * 60 * 1_000,
        );

        fireEvent.pointerDown(
          document.body,
        );

        await advance(
          2 * 60 * 1_000,
        );

        expect(
          screen.getByTestId(
            'warning',
          ),
        ).toHaveTextContent(
          'closed',
        );

        expect(
          authMocks.logout,
        ).not.toHaveBeenCalled();
      },
    );


    it(
      'does not renew local activity from passive events after the warning is open',
      async () => {
        renderProvider();

        await advance(
          14 * 60 * 1_000,
        );

        expect(
          screen.getByTestId(
            'warning',
          ),
        ).toHaveTextContent(
          'open',
        );

        fireEvent.pointerDown(
          document.body,
        );

        fireEvent.keyDown(
          document.body,
          {
            key: 'A',
          },
        );

        fireEvent.scroll(
          document,
        );

        await advance(
          60 * 1_000,
        );

        await flushAsyncWork();

        expect(
          authMocks.logout,
        ).toHaveBeenCalledTimes(
          1,
        );
      },
    );


    it(
      'throttles backend activity synchronization to at most once per minute',
      async () => {
        renderProvider();

        fireEvent.pointerDown(
          document.body,
        );

        await advance(
          30 * 1_000,
        );

        fireEvent.pointerDown(
          document.body,
        );

        expect(
          authMocks
            .recordSessionActivity,
        ).not.toHaveBeenCalled();

        await advance(
          31 * 1_000,
        );

        fireEvent.pointerDown(
          document.body,
        );

        await flushAsyncWork();

        expect(
          authMocks
            .recordSessionActivity,
        ).toHaveBeenCalledTimes(
          1,
        );

        fireEvent.pointerDown(
          document.body,
        );

        expect(
          authMocks
            .recordSessionActivity,
        ).toHaveBeenCalledTimes(
          1,
        );
      },
    );


    it(
      'delivers human activity to the backend after the heartbeat throttle window',
      async () => {
        renderProvider();

        await advance(
          50 * 1_000,
        );

        fireEvent.pointerDown(
          document.body,
        );

        expect(
          authMocks
            .recordSessionActivity,
        ).not.toHaveBeenCalled();

        await advance(
          9 * 1_000,
        );

        expect(
          authMocks
            .recordSessionActivity,
        ).not.toHaveBeenCalled();

        await advance(
          1 * 1_000,
        );

        await flushAsyncWork();

        expect(
          authMocks
            .recordSessionActivity,
        ).toHaveBeenCalledTimes(
          1,
        );

        expect(
          authMocks
            .recordSessionActivity,
        ).toHaveBeenCalledWith(
          'access-token-1',
        );
      },
    );


    it(
      'refreshes once and retries activity when the backend returns 401',
      async () => {
        authMocks
          .recordSessionActivity
          .mockRejectedValueOnce(
            new ApiError(
              401,
              'UNAUTHORIZED',
              'Authentication required',
            ),
          )
          .mockResolvedValueOnce();

        renderProvider();

        await advance(
          61 * 1_000,
        );

        fireEvent.pointerDown(
          document.body,
        );

        await flushAsyncWork();

        expect(
          authMocks
            .refreshSession,
        ).toHaveBeenCalledTimes(
          1,
        );

        expect(
          authMocks
            .recordSessionActivity,
        ).toHaveBeenNthCalledWith(
          1,
          'access-token-1',
        );

        expect(
          authMocks
            .recordSessionActivity,
        ).toHaveBeenNthCalledWith(
          2,
          'access-token-2',
        );

        expect(
          authMocks.logout,
        ).not.toHaveBeenCalled();
      },
    );


    it(
      'continues explicitly from the warning only after backend synchronization succeeds',
      async () => {
        renderProvider();

        await advance(
          14 * 60 * 1_000,
        );

        expect(
          screen.getByTestId(
            'warning',
          ),
        ).toHaveTextContent(
          'open',
        );

        await act(
          async () => {
            fireEvent.click(
              screen.getByRole(
                'button',
                {
                  name: 'Continuar',
                },
              ),
            );

            await Promise.resolve();
            await Promise.resolve();
            await Promise.resolve();
          },
        );

        expect(
          authMocks
            .recordSessionActivity,
        ).toHaveBeenCalled();

        expect(
          screen.getByTestId(
            'warning',
          ),
        ).toHaveTextContent(
          'closed',
        );

        expect(
          authMocks.logout,
        ).not.toHaveBeenCalled();
      },
    );
  },
);
