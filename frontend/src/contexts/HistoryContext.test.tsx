import {
  act,
  renderHook,
  waitFor,
} from '@testing-library/react';

import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import {
  getHistoryAttempts,
  getHistoryCompletedSession,
} from '@/features/history/history-api';

import {
  useAuth,
} from '@/features/auth/AuthContext';

import {
  useDashboard,
} from '@/hooks/useDashboard';

import {
  useHistory,
} from '@/hooks/useHistory';

import {
  HistoryProvider,
} from './HistoryContext';

vi.mock('@/features/auth/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/hooks/useDashboard', () => ({
  useDashboard: vi.fn(),
}));

vi.mock('@/features/history/history-api', () => ({
  ApiError: class ApiError extends Error {
    readonly status: number;
    readonly code: string;

    constructor(
      status: number,
      code: string,
      message: string,
    ) {
      super(message);
      this.status = status;
      this.code = code;
    }
  },
  getHistoryAttempts: vi.fn(),
  getHistoryCompletedSession: vi.fn(),
}));

const authMock = vi.mocked(useAuth);
const dashboardMock = vi.mocked(useDashboard);
const attemptsMock = vi.mocked(getHistoryAttempts);
const completionMock = vi.mocked(
  getHistoryCompletedSession,
);

const COMPLETION = {
  id: 'completion-1',
  sessionId: 'session-1',
  technologyId: 'javascript',
  topicId: 'arrays',
  conceptId: 'concept-1',
  totalExercises: 4,
  correctExercises: 3,
  accuracy: 0.75,
  durationMs: 12000,
  hintsUsed: 1,
  completedAt: '2026-09-12T12:00:00.000Z',
} as const;

function wrapper({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  return (
    <HistoryProvider>
      {children}
    </HistoryProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();

  authMock.mockReturnValue(
    {
      status: 'authenticated',
      accessToken: 'access-token',
    } as ReturnType<typeof useAuth>,
  );

  dashboardMock.mockReturnValue(
    {
      dashboard: {
        progress: [],
        recentCompletedSessions: [
          COMPLETION,
        ],
        review: {
          overview: {
            totalAttempts: 0,
            correctAttempts: 0,
            accuracy: null,
            evidenceLevel: 'none',
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
      isLoading: false,
      error: null,
      refresh: vi.fn(),
      resetState: vi.fn(),
    } as ReturnType<typeof useDashboard>,
  );

  attemptsMock.mockResolvedValue({
    attempts: [],
  });

  completionMock.mockResolvedValue({
    completedSession: COMPLETION,
  });
});

describe('HistoryContext backend', () => {
  it('usa Dashboard para las sesiones recientes', () => {
    const { result } = renderHook(
      () => useHistory(),
      { wrapper },
    );

    expect(
      result.current.recentCompletedSessions,
    ).toEqual([
      {
        id: 'completion-1',
        sessionId: 'session-1',
        technologyId: 'javascript',
        conceptId: 'concept-1',
        totalSteps: 4,
        correctSteps: 3,
        accuracy: 75,
        timeSpentMs: 12000,
        completedAt:
          '2026-09-12T12:00:00.000Z',
      },
    ]);
  });

  it('no carga attempts durante montaje', () => {
    renderHook(
      () => useHistory(),
      { wrapper },
    );

    expect(
      attemptsMock,
    ).not.toHaveBeenCalled();
  });

  it('lee attempts desde backend bajo demanda', async () => {
    attemptsMock.mockResolvedValue({
      attempts: [
        {
          id: 'attempt-1',
          sessionId: 'session-1',
          exerciseId: 'step-1',
          conceptId: 'concept-1',
          technologyId: 'javascript',
          isCorrect: true,
          attemptedAt:
            '2026-09-12T12:01:00.000Z',
          durationMs: 1500,
          hintsUsed: 1,
        },
      ],
    });

    const { result } = renderHook(
      () => useHistory(),
      { wrapper },
    );

    let attempts:
      Awaited<
        ReturnType<
          typeof result.current.getAttemptsBySession
        >
      > = [];

    await act(async () => {
      attempts =
        await result.current.getAttemptsBySession(
          'session-1',
        );
    });

    expect(
      attemptsMock,
    ).toHaveBeenCalledWith(
      'access-token',
      'session-1',
    );

    expect(attempts).toEqual([
      {
        id: 'attempt-1',
        sessionId: 'session-1',
        stepId: 'step-1',
        isCorrect: true,
        timeSpentMs: 1500,
        hintsUsed: 1,
        createdAt:
          '2026-09-12T12:01:00.000Z',
      },
    ]);
  });

  it('expone error independiente de attempts', async () => {
    attemptsMock.mockRejectedValue(
      new Error(
        'attempts no disponibles',
      ),
    );

    const { result } = renderHook(
      () => useHistory(),
      { wrapper },
    );

    await act(async () => {
      await result.current
        .getAttemptsBySession(
          'session-1',
        )
        .catch(() => undefined);
    });

    expect(
      result.current.attemptsError,
    ).toBe(
      'attempts no disponibles',
    );

    expect(
      result.current.completedSessionsError,
    ).toBeNull();
  });

  it('lee una completion concreta desde backend', async () => {
    const { result } = renderHook(
      () => useHistory(),
      { wrapper },
    );

    let completion:
      Awaited<
        ReturnType<
          typeof result.current.getCompletedSession
        >
      > = null;

    await act(async () => {
      completion =
        await result.current.getCompletedSession(
          'session-1',
        );
    });

    expect(
      completionMock,
    ).toHaveBeenCalledWith(
      'access-token',
      'session-1',
    );

    expect(completion).toMatchObject({
      sessionId: 'session-1',
      totalSteps: 4,
      correctSteps: 3,
      accuracy: 75,
    });
  });

  it('reset limpia el error de attempts', async () => {
    attemptsMock.mockRejectedValue(
      new Error('boom'),
    );

    const { result } = renderHook(
      () => useHistory(),
      { wrapper },
    );

    await act(async () => {
      await result.current
        .getAttemptsBySession(
          'session-1',
        )
        .catch(() => undefined);
    });

    expect(
      result.current.attemptsError,
    ).toBe('boom');

    act(() => {
      result.current.resetState?.();
    });

    await waitFor(() => {
      expect(
        result.current.attemptsError,
      ).toBeNull();
    });
  });
});
