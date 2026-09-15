import {
  conceptIdSchema,
  contentSessionIdSchema,
  exerciseIdSchema,
  technologyIdSchema,
  type ConceptId,
  type ContentSessionId,
  type ExerciseId,
  type TechnologyId,
} from '../content/content-id.js';

import type {
  PrismaClient,
} from '../generated/prisma/client.js';

export interface CreateAttemptRecord {
  readonly userId: string;
  readonly sessionId: ContentSessionId;
  readonly exerciseId: ExerciseId;
  readonly conceptId: ConceptId;
  readonly technologyId: TechnologyId;
  readonly isCorrect: boolean;
  readonly attemptedAt: Date;
  readonly durationMs: number | null;
  readonly hintsUsed: number | null;
}

export interface AttemptRecord {
  readonly id: string;
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

export interface AttemptRepository {
  createAttempt(
    record: CreateAttemptRecord,
  ): Promise<AttemptRecord>;

  findByUserAndSessionId(
    userId: string,
    sessionId: ContentSessionId,
  ): Promise<readonly AttemptRecord[]>;
  findByUserAndTrainingRunId(
    userId: string,
    trainingRunId: string,
  ): Promise<readonly AttemptRecord[]>;

  findRecentByUserId(
    userId: string,
    limit: number,
  ): Promise<readonly AttemptRecord[]>;
}

export class PrismaAttemptRepository
implements AttemptRepository {
  public constructor(
    private readonly prisma: PrismaClient,
  ) {}

  public async createAttempt(
    record: CreateAttemptRecord,
  ): Promise<AttemptRecord> {
    const created =
      await this.prisma.attempt.create({
        data: {
          userId:
            record.userId,

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
            record.attemptedAt,

          durationMs:
            record.durationMs,

          hintsUsed:
            record.hintsUsed,
        },
      });

    return mapAttempt(
      created,
    );
  }

  public async findByUserAndSessionId(
    userId: string,
    sessionId: ContentSessionId,
  ): Promise<readonly AttemptRecord[]> {
    const records =
      await this.prisma.attempt.findMany({
        where: {
          userId,
          sessionId,
        },

        orderBy: [
          {
            attemptedAt:
              'asc',
          },
          {
            id:
              'asc',
          },
        ],
      });

    return records.map(
      mapAttempt,
    );
  }

  public async findByUserAndTrainingRunId(
    userId: string,
    trainingRunId: string,
  ): Promise<readonly AttemptRecord[]> {
    const records =
      await this.prisma.attempt.findMany({
        where: {
          userId,
          trainingRunId,
        },
        orderBy: [
          {
            attemptedAt:
              'asc',
          },
          {
            id:
              'asc',
          },
        ],
      });

    return records.map(
      mapAttempt,
    );
  }

  public async findRecentByUserId(
    userId: string,
    limit: number,
  ): Promise<readonly AttemptRecord[]> {
    const records =
      await this.prisma.attempt.findMany({
        where: {
          userId,
        },

        orderBy: [
          {
            attemptedAt:
              'desc',
          },
          {
            id:
              'desc',
          },
        ],

        take:
          limit,
      });

    return records.map(
      mapAttempt,
    );
  }
}

interface PersistedAttempt {
  readonly id: string;
  readonly userId: string;
  readonly sessionId: string;
  readonly exerciseId: string;
  readonly conceptId: string | null;
  readonly technologyId: string;
  readonly isCorrect: boolean;
  readonly attemptedAt: Date;
  readonly durationMs: number | null;
  readonly hintsUsed: number | null;
}

function mapAttempt(
  record: PersistedAttempt,
): AttemptRecord {
  return Object.freeze({
    id:
      record.id,

    userId:
      record.userId,

    sessionId:
      contentSessionIdSchema.parse(
        record.sessionId,
      ),

    exerciseId:
      exerciseIdSchema.parse(
        record.exerciseId,
      ),

    conceptId:
      record.conceptId === null
        ? null
        : conceptIdSchema.parse(
            record.conceptId,
          ),

    technologyId:
      technologyIdSchema.parse(
        record.technologyId,
      ),

    isCorrect:
      record.isCorrect,

    attemptedAt:
      record.attemptedAt,

    durationMs:
      record.durationMs,

    hintsUsed:
      record.hintsUsed,
  });
}
