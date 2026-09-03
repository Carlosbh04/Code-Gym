import type { Attempt, CompletedSession } from './progress';

export interface HistoryContextValue {
  recentCompletedSessions: CompletedSession[];
  completedSessionsLoading: boolean;
  completedSessionsError: string | null;
  getAttemptsBySession: (sessionId: string) => Promise<Attempt[]>;
  attemptsLoading: boolean;
  attemptsError: string | null;
}
