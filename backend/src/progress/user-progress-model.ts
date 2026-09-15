import type {
  ConceptId,
  ContentSessionId,
  ExerciseId,
  TechnologyId,
  TopicId,
} from '../content/content-id.js';

/**
 * T222 defines the backend domain contract for persisted user progress.
 *
 * It deliberately does not make content-catalog existence claims.
 * Content identifiers reference the frontend-owned catalog and are only
 * syntactically validated by this backend layer.
 */

export interface AttemptProgressEvent {
  readonly userId: string;
  readonly sessionId: ContentSessionId;
  readonly exerciseId: ExerciseId;
  readonly conceptId: ConceptId | null;
  readonly technologyId: TechnologyId;
  readonly isCorrect: boolean;
  readonly attemptedAt: Date;
  readonly durationMs: number | null;
  readonly hintsUsed: number | null;
}

export interface CompletedSessionProgressEvent {
  readonly userId: string;
  readonly sessionId: ContentSessionId;
  readonly technologyId: TechnologyId;
  readonly topicId: TopicId | null;
  readonly conceptId: ConceptId;
  readonly totalExercises: number;
  readonly correctExercises: number;
  readonly durationMs: number;
  readonly hintsUsed: number;
  readonly completedAt: Date;
}

export interface ConceptProgressSnapshot {
  readonly userId: string;
  readonly conceptId: ConceptId;
  readonly technologyId: TechnologyId;
  readonly totalAttempts: number;
  readonly correctAttempts: number;
  readonly completedSessions: number;
  readonly lastPracticedAt: Date;
}

export interface ProgressCounters {
  readonly totalAttempts: number;
  readonly correctAttempts: number;
  readonly completedSessions: number;
}

/**
 * Absolute aggregate counters are server-owned.
 *
 * Future HTTP schemas must not accept ProgressCounters as client-controlled
 * state. T223-T225 produce persistence events and T224 will maintain
 * ConceptProgress from those events.
 */
export function calculateAccuracy(
  correct: number,
  total: number,
): number | null {
  assertNonNegativeSafeInteger(
    correct,
    'correct',
  );

  assertNonNegativeSafeInteger(
    total,
    'total',
  );

  if (correct > total) {
    throw new ProgressInvariantError(
      'Correct count cannot exceed total count',
    );
  }

  if (total === 0) {
    return null;
  }

  return correct / total;
}

export function assertProgressCounters(
  counters: ProgressCounters,
): void {
  assertNonNegativeSafeInteger(
    counters.totalAttempts,
    'totalAttempts',
  );

  assertNonNegativeSafeInteger(
    counters.correctAttempts,
    'correctAttempts',
  );

  assertNonNegativeSafeInteger(
    counters.completedSessions,
    'completedSessions',
  );

  if (
    counters.correctAttempts
    > counters.totalAttempts
  ) {
    throw new ProgressInvariantError(
      'Correct attempts cannot exceed total attempts',
    );
  }
}

export function assertCompletedSessionProgress(
  event: Pick<
    CompletedSessionProgressEvent,
    | 'totalExercises'
    | 'correctExercises'
    | 'durationMs'
    | 'hintsUsed'
  >,
): void {
  assertPositiveSafeInteger(
    event.totalExercises,
    'totalExercises',
  );

  assertNonNegativeSafeInteger(
    event.correctExercises,
    'correctExercises',
  );

  assertNonNegativeSafeInteger(
    event.durationMs,
    'durationMs',
  );

  assertNonNegativeSafeInteger(
    event.hintsUsed,
    'hintsUsed',
  );

  if (
    event.correctExercises
    > event.totalExercises
  ) {
    throw new ProgressInvariantError(
      'Correct exercises cannot exceed total exercises',
    );
  }
}

export function assertAttemptProgress(
  event: Pick<
    AttemptProgressEvent,
    'durationMs' | 'hintsUsed'
  >,
): void {
  if (event.durationMs !== null) {
    assertNonNegativeSafeInteger(
      event.durationMs,
      'durationMs',
    );
  }

  if (event.hintsUsed !== null) {
    assertNonNegativeSafeInteger(
      event.hintsUsed,
      'hintsUsed',
    );
  }
}

export class ProgressInvariantError
  extends Error {
  public constructor(
    message = 'Invalid progress state',
  ) {
    super(message);

    this.name =
      'ProgressInvariantError';
  }
}

function assertNonNegativeSafeInteger(
  value: number,
  field: string,
): void {
  if (
    !Number.isSafeInteger(value)
    || value < 0
  ) {
    throw new ProgressInvariantError(
      `${field} must be a non-negative safe integer`,
    );
  }
}

function assertPositiveSafeInteger(
  value: number,
  field: string,
): void {
  if (
    !Number.isSafeInteger(value)
    || value <= 0
  ) {
    throw new ProgressInvariantError(
      `${field} must be a positive safe integer`,
    );
  }
}
