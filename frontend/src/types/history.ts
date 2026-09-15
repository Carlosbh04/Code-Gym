import type { CompletedSession } from './progress';

export interface HistoryAttempt {
  readonly id: string;
  readonly sessionId: string;
  readonly stepId: string;
  readonly isCorrect: boolean;
  readonly timeSpentMs: number | null;
  readonly hintsUsed: number | null;
  readonly createdAt: string;
}

export interface HistoryContextValue {
  readonly recentCompletedSessions: CompletedSession[];
  readonly completedSessionsLoading: boolean;
  readonly completedSessionsError: string | null;

  readonly getCompletedSession: (
    sessionId: string,
  ) => Promise<CompletedSession | null>;

  readonly getAttemptsBySession: (
    sessionId: string,
  ) => Promise<HistoryAttempt[]>;

  readonly attemptsLoading: boolean;
  readonly attemptsError: string | null;
  readonly resetState?: () => void;
}
