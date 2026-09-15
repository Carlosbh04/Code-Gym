import type {
  HistoryAttempt as HistoryAttemptDto,
  HistoryCompletedSession,
} from './history-api';

import type {
  HistoryAttempt,
} from '@/types/history';

import type {
  CompletedSession,
} from '@/types/progress';

export function adaptHistoryAttempt(
  attempt: HistoryAttemptDto,
): HistoryAttempt {
  return {
    id: attempt.id,
    sessionId: attempt.sessionId,
    stepId: attempt.exerciseId,
    isCorrect: attempt.isCorrect,
    timeSpentMs: attempt.durationMs,
    hintsUsed: attempt.hintsUsed,
    createdAt: attempt.attemptedAt,
  };
}

export function adaptHistoryAttempts(
  attempts: readonly HistoryAttemptDto[],
): HistoryAttempt[] {
  return attempts.map(
    adaptHistoryAttempt,
  );
}

export function adaptHistoryCompletedSession(
  session: HistoryCompletedSession,
): CompletedSession | null {
  if (session.conceptId === null) {
    return null;
  }

  return {
    id: session.id,
    sessionId: session.sessionId,
    technologyId:
      session.technologyId,
    conceptId:
      session.conceptId,
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
