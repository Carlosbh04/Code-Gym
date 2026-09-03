import type { Attempt, CompletedSession } from './progress';

export interface HistoryContextValue {
  recentCompletedSessions: CompletedSession[];
  completedSessionsLoading: boolean;
  completedSessionsError: string | null;
  /** Lee una sesión completada concreta sin exponer su repositorio a la UI. */
  getCompletedSession: (sessionId: string) => Promise<CompletedSession | null>;
  getAttemptsBySession: (sessionId: string) => Promise<Attempt[]>;
  attemptsLoading: boolean;
  attemptsError: string | null;
}
