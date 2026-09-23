import {
  conceptIdSchema,
  contentSessionIdSchema,
  technologyIdSchema,
  topicIdSchema,
  type ConceptId,
  type ContentSessionId,
  type TechnologyId,
  type TopicId,
} from '../content/content-id.js';

import type {
  PrismaClient,
} from '../generated/prisma/client.js';

import {
  mapConceptProgress,
  type ConceptProgressRecord,
} from './concept-progress-repository.js';

export interface CreateCompletedSessionRecord {
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

export interface CompletedSessionRecord {
  readonly id: string;
  readonly userId: string;
  readonly trainingRunId: string | null;
  readonly sessionId: ContentSessionId;
  readonly technologyId: TechnologyId;
  readonly topicId: TopicId | null;
  readonly conceptId: ConceptId | null;
  readonly totalExercises: number;
  readonly correctExercises: number;
  readonly durationMs: number;
  readonly hintsUsed: number;
  readonly completedAt: Date;
}

export interface RecordedCompletion {
  readonly completedSession:
    CompletedSessionRecord;

  readonly conceptProgress:
    ConceptProgressRecord;
}

export interface CompletedSessionRepository {
  createCompletedSessionAndUpdateProgress(
    record: CreateCompletedSessionRecord,
  ): Promise<RecordedCompletion>;

  findLatestByUserAndSessionId(
    userId: string,
    sessionId: ContentSessionId,
  ): Promise<CompletedSessionRecord | null>;

  findRecentByUserId(
    userId: string,
    limit: number,
  ): Promise<readonly CompletedSessionRecord[]>;

  findLatestByUserAndTechnologyId?(
    userId: string,
    technologyId: TechnologyId,
  ): Promise<readonly CompletedSessionRecord[]>;
}

export class PrismaCompletedSessionRepository
implements CompletedSessionRepository {
  public constructor(
    private readonly prisma: PrismaClient,
  ) {}

  public async createCompletedSessionAndUpdateProgress(
    record: CreateCompletedSessionRecord,
  ): Promise<RecordedCompletion> {
    return this.prisma.$transaction(
      async (
        transaction,
      ) => {
        const completedSession =
          await transaction.completedSession.create({
            data: {
              userId:
                record.userId,

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

              durationMs:
                record.durationMs,

              hintsUsed:
                record.hintsUsed,

              completedAt:
                record.completedAt,
            },
          });

        const progress =
          await transaction.conceptProgress.upsert({
            where: {
              userId_conceptId: {
                userId:
                  record.userId,

                conceptId:
                  record.conceptId,
              },
            },

            create: {
              userId:
                record.userId,

              conceptId:
                record.conceptId,

              technologyId:
                record.technologyId,

              totalAttempts:
                record.totalExercises,

              correctAttempts:
                record.correctExercises,

              completedSessions:
                1,

              lastPracticedAt:
                record.completedAt,
            },

            update: {
              totalAttempts: {
                increment:
                  record.totalExercises,
              },

              correctAttempts: {
                increment:
                  record.correctExercises,
              },

              completedSessions: {
                increment:
                  1,
              },
            },
          });

        if (
          progress.technologyId
          !== record.technologyId
        ) {
          throw new ConceptProgressTechnologyMismatchError();
        }

        await transaction.conceptProgress.updateMany({
          where: {
            userId:
              record.userId,

            conceptId:
              record.conceptId,

            lastPracticedAt: {
              lt:
                record.completedAt,
            },
          },

          data: {
            lastPracticedAt:
              record.completedAt,
          },
        });

        const finalProgress =
          await transaction.conceptProgress
            .findUniqueOrThrow({
              where: {
                userId_conceptId: {
                  userId:
                    record.userId,

                  conceptId:
                    record.conceptId,
                },
              },
            });

        return Object.freeze({
          completedSession:
            mapCompletedSession(
              completedSession,
            ),

          conceptProgress:
            mapConceptProgress(
              finalProgress,
            ),
        });
      },
    );
  }

  public async findLatestByUserAndSessionId(
    userId: string,
    sessionId: ContentSessionId,
  ): Promise<CompletedSessionRecord | null> {
    const record =
      await this.prisma.completedSession.findFirst({
        where: {
          userId,
          sessionId,
        },

        orderBy: [
          {
            completedAt:
              'desc',
          },
          {
            id:
              'desc',
          },
        ],
      });

    return record === null
      ? null
      : mapCompletedSession(
          record,
        );
  }

  public async findLatestByUserAndTechnologyId(
    userId: string,
    technologyId: TechnologyId,
  ): Promise<readonly CompletedSessionRecord[]> {
    const records =
      await this.prisma.completedSession.findMany({
        where: {
          userId,
          technologyId,
        },

        /*
         * TECHNOLOGY_HISTORY_SNAPSHOT
         *
         * La primera fila encontrada para cada sessionId
         * es siempre su finalización más reciente.
         */
        orderBy: [
          {
            completedAt:
              'desc',
          },
          {
            id:
              'desc',
          },
        ],
      });

    const seenSessionIds =
      new Set<string>();

    const latest = [];

    for (const record of records) {
      if (
        seenSessionIds.has(
          record.sessionId,
        )
      ) {
        continue;
      }

      seenSessionIds.add(
        record.sessionId,
      );

      latest.push(
        mapCompletedSession(
          record,
        ),
      );
    }

    return latest;
  }

  public async findRecentByUserId(
    userId: string,
    limit: number,
  ): Promise<readonly CompletedSessionRecord[]> {
    const records =
      await this.prisma.completedSession.findMany({
        where: {
          userId,
        },

        orderBy: [
          {
            completedAt:
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
      mapCompletedSession,
    );
  }
}

export class ConceptProgressTechnologyMismatchError
  extends Error {
  public constructor() {
    super(
      'Concept progress technology does not match completion technology',
    );

    this.name =
      'ConceptProgressTechnologyMismatchError';
  }
}

interface PersistedCompletedSession {
  readonly id: string;
  readonly userId: string;
  readonly trainingRunId: string | null;
  readonly sessionId: string;
  readonly technologyId: string;
  readonly topicId: string | null;
  readonly conceptId: string | null;
  readonly totalExercises: number;
  readonly correctExercises: number;
  readonly durationMs: number;
  readonly hintsUsed: number;
  readonly completedAt: Date;
}

function mapCompletedSession(
  record: PersistedCompletedSession,
): CompletedSessionRecord {
  return Object.freeze({
    id:
      record.id,

    userId:
      record.userId,
    trainingRunId:
      record.trainingRunId,

    sessionId:
      contentSessionIdSchema.parse(
        record.sessionId,
      ),

    technologyId:
      technologyIdSchema.parse(
        record.technologyId,
      ),

    topicId:
      record.topicId === null
        ? null
        : topicIdSchema.parse(
            record.topicId,
          ),

    conceptId:
      record.conceptId === null
        ? null
        : conceptIdSchema.parse(
            record.conceptId,
          ),

    totalExercises:
      record.totalExercises,

    correctExercises:
      record.correctExercises,

    durationMs:
      record.durationMs,

    hintsUsed:
      record.hintsUsed,

    completedAt:
      record.completedAt,
  });
}
