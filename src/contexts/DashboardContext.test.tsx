import {
  act,
  renderHook,
  waitFor,
} from '@testing-library/react';

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import type {
  ReactNode,
} from 'react';

import {
  DashboardProvider,
} from './DashboardContext';

import {
  useDashboard,
} from '@/hooks/useDashboard';

const useAuthMock =
  vi.fn();

vi.mock(
  '@/features/auth/AuthContext',
  () => ({
    useAuth: () =>
      useAuthMock(),
  }),
);

const authenticatedAuth = {
  user: {
    id: 'user-1',
    email: 'user@example.com',
    displayName: 'Test User',
    role: 'USER',
    createdAt:
      '2026-09-12T12:00:00.000Z',
    updatedAt:
      '2026-09-12T12:00:00.000Z',
  },
  accessToken:
    'access-token-test',
  status: 'authenticated',
  isAuthenticated: true,
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
} as const;

const unauthenticatedAuth = {
  user: null,
  accessToken: null,
  status: 'unauthenticated',
  isAuthenticated: false,
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
} as const;

function Wrapper({
  children,
}: {
  readonly children: ReactNode;
}) {
  return (
    <DashboardProvider>
      {children}
    </DashboardProvider>
  );
}

function dashboardPayload() {
  return {
    dashboard: {
      progress: [],
      recentCompletedSessions: [],
      review: {
        overview: {
          totalAttempts: 0,
          correctAttempts: 0,
          accuracy: null,
          evidenceLevel:
            'none',
        },
        candidates: [],
      },
      badges: {
        summary: {
          totalAttempts: 0,
          correctAttempts: 0,
          completedSessions: 0,
          accuracy: null,
        },
        badges: [],
      },
    },
  };
}

beforeEach(() => {
  useAuthMock.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe(
  'DashboardProvider',
  () => {
    it(
      'carga el dashboard autenticado',
      async () => {
        useAuthMock.mockReturnValue(
          authenticatedAuth,
        );

        const payload =
          dashboardPayload();

        const fetchMock =
          vi.fn().mockResolvedValue(
            new Response(
              JSON.stringify(
                payload,
              ),
              {
                status: 200,
                headers: {
                  'Content-Type':
                    'application/json',
                },
              },
            ),
          );

        vi.stubGlobal(
          'fetch',
          fetchMock,
        );

        const view =
          renderHook(
            () =>
              useDashboard(),
            {
              wrapper:
                Wrapper,
            },
          );

        await waitFor(() =>
          expect(
            view.result.current
              .dashboard,
          ).toEqual(
            payload.dashboard,
          ),
        );

        expect(
          view.result.current.error,
        ).toBeNull();

        expect(fetchMock)
          .toHaveBeenCalledTimes(
            1,
          );
      },
    );

    it(
      'no consulta dashboard sin autenticación',
      async () => {
        useAuthMock.mockReturnValue(
          unauthenticatedAuth,
        );

        const fetchMock =
          vi.fn();

        vi.stubGlobal(
          'fetch',
          fetchMock,
        );

        const view =
          renderHook(
            () =>
              useDashboard(),
            {
              wrapper:
                Wrapper,
            },
          );

        expect(
          view.result.current
            .dashboard,
        ).toBeNull();

        expect(
          view.result.current
            .isLoading,
        ).toBe(false);

        expect(fetchMock)
          .not
          .toHaveBeenCalled();
      },
    );

    it(
      'refresh vuelve a consultar el snapshot remoto',
      async () => {
        useAuthMock.mockReturnValue(
          authenticatedAuth,
        );

        const payload =
          dashboardPayload();

        const fetchMock =
          vi.fn().mockResolvedValue(
            new Response(
              JSON.stringify(
                payload,
              ),
              {
                status: 200,
                headers: {
                  'Content-Type':
                    'application/json',
                },
              },
            ),
          );

        vi.stubGlobal(
          'fetch',
          fetchMock,
        );

        const view =
          renderHook(
            () =>
              useDashboard(),
            {
              wrapper:
                Wrapper,
            },
          );

        await waitFor(() =>
          expect(fetchMock)
            .toHaveBeenCalledTimes(
              1,
            ),
        );

        await act(
          async () => {
            await view
              .result.current
              .refresh();
          },
        );

        expect(fetchMock)
          .toHaveBeenCalledTimes(
            2,
          );
      },
    );
  },
);
