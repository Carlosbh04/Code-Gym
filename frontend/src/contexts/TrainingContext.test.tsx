import {
  type ReactNode,
} from 'react';

import {
  act,
  renderHook,
} from '@testing-library/react';

import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import {
  useAuth,
} from '@/features/auth/AuthContext';

import {
  DashboardContext,
  type DashboardContextValue,
} from '@/contexts/dashboard-context';

import {
  TrainingProvider,
} from '@/contexts/TrainingContext';

import {
  useTraining,
} from '@/hooks/useTraining';

vi.mock(
  '@/features/auth/AuthContext',
  () => ({
    useAuth: vi.fn(),
  }),
);

const useAuthMock =
  vi.mocked(useAuth);

const refreshDashboard =
  vi.fn();

const dashboardValue: DashboardContextValue = {
  dashboard: null,
  isLoading: false,
  error: null,
  refresh: refreshDashboard,
  resetState: vi.fn(),
};

function wrapper({
  children,
}: {
  readonly children: ReactNode;
}) {
  return (
    <DashboardContext.Provider
      value={dashboardValue}
    >
      <TrainingProvider>
        {children}
      </TrainingProvider>
    </DashboardContext.Provider>
  );
}

function jsonResponse(
  body: unknown,
  status = 200,
): Response {
  return new Response(
    JSON.stringify(body),
    {
      status,
      headers: {
        'Content-Type':
          'application/json',
      },
    },
  );
}

describe('TrainingProvider', () => {
  afterEach(() => {
    useAuthMock.mockReset();
    refreshDashboard.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('requires authenticated state before starting a run', async () => {
    vi.spyOn(
      globalThis,
      'fetch',
    ).mockResolvedValue(
      jsonResponse(
        {
          error: {
            code:
              'UNAUTHORIZED',
            message:
              'Authentication required',
          },
        },
        401,
      ),
    );

    useAuthMock.mockReturnValue({
      accessToken: null,
      isAuthenticated: false,
    } as ReturnType<typeof useAuth>);

    const {
      result,
    } = renderHook(
      () => useTraining(),
      {
        wrapper,
      },
    );

    await expect(
      act(async () =>
        result.current.startRun(
          'js-arrays-map-vs-foreach-01',
        ),
      ),
    ).rejects.toThrow(
      'Authentication is required for training',
    );
  });

  it('refresca el dashboard al confirmar la finalización backend', async () => {
    useAuthMock.mockReturnValue({
      accessToken: 'access-token',
      isAuthenticated: true,
    } as ReturnType<typeof useAuth>);
    refreshDashboard.mockResolvedValue(
      undefined,
    );

    vi.spyOn(
      globalThis,
      'fetch',
    ).mockResolvedValue(
      jsonResponse({
        result: {
          attempt: {
            id: 'attempt-1',
            exerciseId: 'step-4',
            isCorrect: true,
            attemptedAt: '2026-09-14T12:00:00.000Z',
            durationMs: 1_000,
            hintsUsed: 0,
          },
          run: {
            id: 'run-1',
            sessionId: 'session-1',
            technologyId: 'javascript',
            topicId: 'js-arrays',
            conceptId: 'js-array-iteration',
            status: 'completed',
            totalExercises: 4,
            answeredExercises: 4,
            correctExercises: 4,
            durationMs: 4_000,
            hintsUsed: 0,
            startedAt: '2026-09-14T11:59:56.000Z',
            completedAt: '2026-09-14T12:00:00.000Z',
          },
          completion: {
            id: 'completion-1',
            completedAt: '2026-09-14T12:00:00.000Z',
            totalExercises: 4,
            correctExercises: 4,
            durationMs: 4_000,
            hintsUsed: 0,
            accuracy: 100,
          },
        },
      }),
    );

    const { result } = renderHook(
      () => useTraining(),
      { wrapper },
    );

    await act(async () => {
      await result.current.submitAnswer(
        'run-1',
        {
          exerciseId: 'step-4',
          answer: 'solution',
          durationMs: 1_000,
        },
      );
    });

    expect(refreshDashboard)
      .toHaveBeenCalledTimes(1);
  });
});
