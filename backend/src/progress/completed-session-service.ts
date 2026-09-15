import type {
  ConceptId,
  ContentSessionId,
  TechnologyId,
  TopicId,
} from '../content/content-id.js';

import type {
  CompletedSessionRecord,
  CompletedSessionRepository,
} from './completed-session-repository.js';

import type {
  ConceptProgressRecord,
} from './concept-progress-repository.js';

import {
  assertCompletedSessionProgress,
  calculateAccuracy,
} from './user-progress-model.js';

export interface RecordTrustedCompletionInput {
  readonly userId: string;
  readonly sessionId: ContentSessionId;
  readonly technologyId: TechnologyId;
  readonly topicId: TopicId | null;
  readonly conceptId: ConceptId;
  readonly totalExercises: number;
  readonly correctExercises: number;
  readonly durationMs: number;
  readonly hintsUsed: number;
}

export interface CompletedSessionView {
  readonly id: string;
  readonly sessionId: ContentSessionId;
  readonly technologyId: TechnologyId;
  readonly topicId: TopicId | null;
  readonly conceptId: ConceptId | null;
  readonly totalExercises: number;
  readonly correctExercises: number;
  readonly accuracy: number;
  readonly durationMs: number;
  readonly hintsUsed: number;
  readonly completedAt: string;
}

export interface CompletedSessionHistoryTarget {
  readonly completedSession:
    CompletedSessionView;
  readonly trainingRunId:
    string | null;
}

export interface CompletionConceptProgressView {
  readonly conceptId: ConceptId;
  readonly technologyId: TechnologyId;
  readonly totalAttempts: number;
  readonly correctAttempts: number;
  readonly completedSessions: number;
  readonly accuracy: number | null;
  readonly lastPracticedAt: string;
}

export interface RecordedCompletionView {
  readonly completedSession:
    CompletedSessionView;

  readonly conceptProgress:
    CompletionConceptProgressView;
}

export type CompletedSessionClock =
  () => Date;

export class CompletedSessionService {
  public constructor(
    private readonly repository:
      Pick<
        CompletedSessionRepository,
        | 'createCompletedSessionAndUpdateProgress'
        | 'findLatestByUserAndSessionId'
        | 'findRecentByUserId'
      >,

    private readonly clock:
      CompletedSessionClock =
        () => new Date(),
  ) {}

  /**
   * Internal trusted-write boundary.
   *
   * The completion event and ConceptProgress aggregate are persisted in one
   * database transaction. A future HTTP route must not forward browser-owned
   * correctness totals directly into this method.
   */
  public async recordTrustedCompletion(
    input: RecordTrustedCompletionInput,
  ): Promise<RecordedCompletionView> {
    assertCompletedSessionProgress(
      input,
    );

    const result =
      await this.repository
        .createCompletedSessionAndUpdateProgress({
          ...input,

          completedAt:
            this.clock(),
        });

    return Object.freeze({
      completedSession:
        toCompletedSessionView(
          result.completedSession,
        ),

      conceptProgress:
        toConceptProgressView(
          result.conceptProgress,
        ),
    });
  }

  public async getCompletedSession(
    userId: string,
    sessionId: ContentSessionId,
  ): Promise<CompletedSessionView | null> {
    const record =
      await this.repository
        .findLatestByUserAndSessionId(
          userId,
          sessionId,
        );

    return record === null
      ? null
      : toCompletedSessionView(
          record,
        );
  }

  public async getCompletedSessionHistoryTarget(
    userId: string,
    sessionId: ContentSessionId,
  ): Promise<CompletedSessionHistoryTarget | null> {
    const record =
      await this.repository
        .findLatestByUserAndSessionId(
          userId,
          sessionId,
        );

    if (record === null) {
      return null;
    }

    return Object.freeze({
      completedSession:
        toCompletedSessionView(
          record,
        ),
      trainingRunId:
        record.trainingRunId,
    });
  }

  public async listRecentCompletedSessions(
    userId: string,
    limit: number,
  ): Promise<readonly CompletedSessionView[]> {
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
      toCompletedSessionView,
    );
  }
}

export class InvalidCompletedSessionReadLimitError
  extends Error {
  public constructor() {
    super(
      'Completed-session read limit must be an integer between 1 and 100',
    );

    this.name =
      'InvalidCompletedSessionReadLimitError';
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
    throw new InvalidCompletedSessionReadLimitError();
  }
}

function toCompletedSessionView(
  record: CompletedSessionRecord,
): CompletedSessionView {
  const accuracy =
    calculateAccuracy(
      record.correctExercises,
      record.totalExercises,
    );

  if (accuracy === null) {
    throw new Error(
      'Persisted completed session has no exercises',
    );
  }

  return Object.freeze({
    id:
      record.id,

    sessionId:
      record.sessionId,

    technologyId:
      record.technologyId,

    topicId:
      record.topicId,

    conceptId:
      record.conceptId,

    totalExercises:
      record.totalExercises,

    correctExercises:
      record.correctExercises,

    accuracy,

    durationMs:
      record.durationMs,

    hintsUsed:
      record.hintsUsed,

    completedAt:
      record.completedAt
        .toISOString(),
  });
}

function toConceptProgressView(
  record: ConceptProgressRecord,
): CompletionConceptProgressView {
  return Object.freeze({
    conceptId:
      record.conceptId,

    technologyId:
      record.technologyId,

    totalAttempts:
      record.totalAttempts,

    correctAttempts:
      record.correctAttempts,

    completedSessions:
      record.completedSessions,

    accuracy:
      calculateAccuracy(
        record.correctAttempts,
        record.totalAttempts,
      ),

    lastPracticedAt:
      record.lastPracticedAt
        .toISOString(),
  });
}
