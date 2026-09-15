import type {
  DashboardCompletedSession,
  DashboardConceptProgress,
} from './dashboard-api';

export interface ServerConceptProgress {
  readonly conceptId: string;
  readonly technologyId: string;
  readonly totalAttempts: number;
  readonly correctAttempts: number;
  readonly completedSessions: number;
  readonly accuracy: number | null;
  readonly lastPracticed: string;
}

export interface ServerCompletedSession {
  readonly id: string;
  readonly sessionId: string;
  readonly technologyId: string;
  readonly conceptId: string;
  readonly totalSteps: number;
  readonly correctSteps: number;
  readonly accuracy: number;
  readonly timeSpentMs: number;
  readonly completedAt: string;
}

export function adaptConceptProgress(
  progress: DashboardConceptProgress,
): ServerConceptProgress {
  return {
    conceptId: progress.conceptId,
    technologyId:
      progress.technologyId,
    totalAttempts:
      progress.totalAttempts,
    correctAttempts:
      progress.correctAttempts,
    completedSessions:
      progress.completedSessions,
    accuracy:
      progress.accuracy,
    lastPracticed:
      progress.lastPracticedAt,
  };
}

export function adaptCompletedSession(
  session: DashboardCompletedSession,
): ServerCompletedSession | null {
  if (session.conceptId === null) {
    return null;
  }

  return {
    id: session.id,
    sessionId: session.sessionId,
    technologyId:
      session.technologyId,
    conceptId: session.conceptId,
    totalSteps:
      session.totalExercises,
    correctSteps:
      session.correctExercises,
    accuracy:
      session.accuracy * 100,
    timeSpentMs:
      session.durationMs,
    completedAt:
      session.completedAt,
  };
}

export function adaptCompletedSessions(
  sessions:
    readonly DashboardCompletedSession[],
): ServerCompletedSession[] {
  return sessions.flatMap(
    (session) => {
      const adapted =
        adaptCompletedSession(
          session,
        );

      return adapted === null
        ? []
        : [adapted];
    },
  );
}
