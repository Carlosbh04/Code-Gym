import type {
  ConceptId,
  ContentSessionId,
  ExerciseId,
  TechnologyId,
} from '../content/content-id.js';

import type {
  AttemptRecord,
  AttemptRepository,
} from './attempt-repository.js';

import {
  assertAttemptProgress,
} from './user-progress-model.js';

export interface RecordTrustedAttemptInput {
  readonly userId: string;
  readonly sessionId: ContentSessionId;
  readonly exerciseId: ExerciseId;
  readonly conceptId: ConceptId;
  readonly technologyId: TechnologyId;
  readonly isCorrect: boolean;
  readonly durationMs: number | null;
  readonly hintsUsed: number | null;
}

export interface AttemptView {
  readonly id: string;
  readonly sessionId: ContentSessionId;
  readonly exerciseId: ExerciseId;
  readonly conceptId: ConceptId | null;
  readonly technologyId: TechnologyId;
  readonly isCorrect: boolean;
  readonly attemptedAt: string;
  readonly durationMs: number | null;
  readonly hintsUsed: number | null;
}

export type AttemptClock =
  () => Date;

export class AttemptService {
  public constructor(
    private readonly repository:
      Pick<
        AttemptRepository,
        | 'createAttempt'
        | 'findByUserAndSessionId'
        | 'findByUserAndTrainingRunId'
        | 'findRecentByUserId'
      >,

    private readonly clock:
      AttemptClock =
        () => new Date(),
  ) {}

  /**
   * Internal trusted-write boundary.
   *
   * Attempts are immutable history events. Recording an Attempt must never
   * increment ConceptProgress: T224 owns aggregate updates through a trusted
   * completed-session event.
   */
  public async recordTrustedAttempt(
    input: RecordTrustedAttemptInput,
  ): Promise<AttemptView> {
    assertAttemptProgress(
      input,
    );

    const record =
      await this.repository
        .createAttempt({
          ...input,

          attemptedAt:
            this.clock(),
        });

    return toAttemptView(
      record,
    );
  }

  public async getAttemptsBySession(
    userId: string,
    sessionId: ContentSessionId,
  ): Promise<readonly AttemptView[]> {
    const records =
      await this.repository
        .findByUserAndSessionId(
          userId,
          sessionId,
        );

    return records.map(
      toAttemptView,
    );
  }

  public async getAttemptsByTrainingRun(
    userId: string,
    trainingRunId: string,
  ): Promise<readonly AttemptView[]> {
    const records =
      await this.repository
        .findByUserAndTrainingRunId(
          userId,
          trainingRunId,
        );

    return records.map(
      toAttemptView,
    );
  }

  public async listRecentAttempts(
    userId: string,
    limit: number,
  ): Promise<readonly AttemptView[]> {
    assertReadLimit(
      limit,
    );

    const records =
      await this.repository
        .findRecentByUserId(
          userId,
          limit,
        );

    return records.map(
      toAttemptView,
    );
  }
}

export class InvalidAttemptReadLimitError
  extends Error {
  public constructor() {
    super(
      'Attempt read limit must be an integer between 1 and 100',
    );

    this.name =
      'InvalidAttemptReadLimitError';
  }
}

function assertReadLimit(
  limit: number,
): void {
  if (
    !Number.isSafeInteger(
      limit,
    )
    || limit < 1
    || limit > 100
  ) {
    throw new InvalidAttemptReadLimitError();
  }
}

function toAttemptView(
  record: AttemptRecord,
): AttemptView {
  return Object.freeze({
    id:
      record.id,

    sessionId:
      record.sessionId,

    exerciseId:
      record.exerciseId,

    conceptId:
      record.conceptId,

    technologyId:
      record.technologyId,

    isCorrect:
      record.isCorrect,

    attemptedAt:
      record.attemptedAt
        .toISOString(),

    durationMs:
      record.durationMs,

    hintsUsed:
      record.hintsUsed,
  });
}
