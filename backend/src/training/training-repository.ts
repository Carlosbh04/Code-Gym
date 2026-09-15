import {
  conceptIdSchema,
  contentSessionIdSchema,
  exerciseIdSchema,
  technologyIdSchema,
  topicIdSchema,
  type ConceptId,
  type ContentSessionId,
  type ExerciseId,
  type TechnologyId,
  type TopicId,
} from '../content/content-id.js';
import type {
  PrismaClient,
} from '../generated/prisma/client.js';

export type TrainingRunStatus =
  | 'ACTIVE'
  | 'COMPLETED';

export interface CreateTrainingRunRecord {
  readonly userId: string;
  readonly sessionId: ContentSessionId;
  readonly technologyId: TechnologyId;
  readonly topicId: TopicId;
  readonly conceptId: ConceptId;
  readonly totalExercises: number;
  readonly startedAt: Date;
}

export interface TrainingRunRecord {
  readonly id: string;
  readonly userId: string;
  readonly sessionId: ContentSessionId;
  readonly technologyId: TechnologyId;
  readonly topicId: TopicId;
  readonly conceptId: ConceptId;
  readonly status: TrainingRunStatus;
  readonly totalExercises: number;
  readonly answeredExercises: number;
  readonly correctExercises: number;
  readonly durationMs: number;
  readonly hintsUsed: number;
  readonly startedAt: Date;
  readonly completedAt: Date | null;
}

export interface RecordScoredTrainingAnswerInput {
  readonly userId: string;
  readonly runId: string;
  readonly exerciseId: ExerciseId;
  readonly exercisePosition: number;
  readonly isCorrect: boolean;
  readonly durationMs: number;
  readonly attemptedAt: Date;
}

export interface RevealNextTrainingHintInput {
  readonly userId: string;
  readonly runId: string;
  readonly exerciseId: ExerciseId;
  readonly exercisePosition: number;
  readonly totalHints: number;
  readonly revealedAt: Date;
}

export interface TrainingHintRevealRecord {
  readonly index: number;
  readonly revealedAt: Date;
}

export interface TrainingAttemptRecord {
  readonly id: string;
  readonly exerciseId: ExerciseId;
  readonly isCorrect: boolean;
  readonly attemptedAt: Date;
  readonly durationMs: number;
  readonly hintsUsed: number;
}

export interface TrainingCompletionRecord {
  readonly id: string;
  readonly completedAt: Date;
  readonly totalExercises: number;
  readonly correctExercises: number;
  readonly durationMs: number;
  readonly hintsUsed: number;
}

export interface RecordedTrainingAnswer {
  readonly attempt: TrainingAttemptRecord;
  readonly run: TrainingRunRecord;
  readonly completion: TrainingCompletionRecord | null;
}

export interface TrainingRepository {
  createRun(
    record: CreateTrainingRunRecord,
  ): Promise<TrainingRunRecord>;

  findOwnedRun(
    userId: string,
    runId: string,
  ): Promise<TrainingRunRecord | null>;

  revealNextHint(
    input: RevealNextTrainingHintInput,
  ): Promise<TrainingHintRevealRecord>;

  recordScoredAnswerAndMaybeComplete(
    input: RecordScoredTrainingAnswerInput,
  ): Promise<RecordedTrainingAnswer>;
}

export class PrismaTrainingRepository
implements TrainingRepository {
  public constructor(
    private readonly prisma: PrismaClient,
  ) {}

  public async createRun(
    record: CreateTrainingRunRecord,
  ): Promise<TrainingRunRecord> {
    const created =
      await this.prisma.trainingRun.create({
        data: {
          userId: record.userId,
          sessionId: record.sessionId,
          technologyId: record.technologyId,
          topicId: record.topicId,
          conceptId: record.conceptId,
          totalExercises: record.totalExercises,
          startedAt: record.startedAt,
        },
      });

    return mapTrainingRun(created);
  }

  public async findOwnedRun(
    userId: string,
    runId: string,
  ): Promise<TrainingRunRecord | null> {
    const run =
      await this.prisma.trainingRun.findFirst({
        where: {
          id: runId,
          userId,
        },
      });

    return run === null
      ? null
      : mapTrainingRun(run);
  }

  public async revealNextHint(
    input: RevealNextTrainingHintInput,
  ): Promise<TrainingHintRevealRecord> {
    for (
      let attempt = 0;
      attempt < 2;
      attempt += 1
    ) {
      try {
        return await this.prisma.$transaction(
          async (transaction) => {
            await lockOwnedTrainingRun(
              transaction,
              input.userId,
              input.runId,
            );

            const currentRun =
              await transaction.trainingRun.findFirst({
                where: {
                  id: input.runId,
                  userId: input.userId,
                },
              });

            if (currentRun === null) {
              throw new TrainingRunNotFoundError();
            }

            if (currentRun.status !== 'ACTIVE') {
              throw new TrainingRunClosedError();
            }

            if (
              currentRun.answeredExercises
              !== input.exercisePosition
            ) {
              throw new TrainingExerciseOutOfOrderError();
            }

            const hintIndex =
              await transaction.trainingHintReveal.count({
                where: {
                  trainingRunId: currentRun.id,
                  exerciseId: input.exerciseId,
                },
              });

            if (hintIndex >= input.totalHints) {
              throw new TrainingHintsExhaustedError();
            }

            const reveal =
              await transaction.trainingHintReveal.create({
                data: {
                  trainingRunId: currentRun.id,
                  exerciseId: input.exerciseId,
                  hintIndex,
                  revealedAt: input.revealedAt,
                },
              });

            return Object.freeze({
              index: reveal.hintIndex,
              revealedAt: reveal.revealedAt,
            });
          },
        );
      } catch (error) {
        if (
          isPrismaUniqueConstraintError(error)
          && attempt === 0
        ) {
          continue;
        }

        throw error;
      }
    }

    throw new TrainingRunInvariantError();
  }

  public async recordScoredAnswerAndMaybeComplete(
    input: RecordScoredTrainingAnswerInput,
  ): Promise<RecordedTrainingAnswer> {
    try {
      return await this.prisma.$transaction(
        async (transaction) => {
          await lockOwnedTrainingRun(
            transaction,
            input.userId,
            input.runId,
          );

          const currentRun =
            await transaction.trainingRun.findFirst({
              where: {
                id: input.runId,
                userId: input.userId,
              },
            });

          if (currentRun === null) {
            throw new TrainingRunNotFoundError();
          }

          if (currentRun.status !== 'ACTIVE') {
            throw new TrainingRunClosedError();
          }

          if (
            currentRun.answeredExercises
            !== input.exercisePosition
          ) {
            throw new TrainingExerciseOutOfOrderError();
          }

          const hintsUsed =
            await transaction.trainingHintReveal.count({
              where: {
                trainingRunId: currentRun.id,
                exerciseId: input.exerciseId,
              },
            });

          const attempt =
            await transaction.attempt.create({
              data: {
                userId: currentRun.userId,
                trainingRunId: currentRun.id,
                sessionId: currentRun.sessionId,
                exerciseId: input.exerciseId,
                conceptId: currentRun.conceptId,
                technologyId: currentRun.technologyId,
                isCorrect: input.isCorrect,
                attemptedAt: input.attemptedAt,
                durationMs: input.durationMs,
                hintsUsed,
              },
            });

          const updatedCount =
            await transaction.trainingRun.updateMany({
              where: {
                id: currentRun.id,
                userId: currentRun.userId,
                status: 'ACTIVE',
              },
              data: {
                answeredExercises: {
                  increment: 1,
                },
                correctExercises: {
                  increment: input.isCorrect
                    ? 1
                    : 0,
                },
                durationMs: {
                  increment: input.durationMs,
                },
                hintsUsed: {
                  increment: hintsUsed,
                },
              },
            });

          if (updatedCount.count !== 1) {
            throw new TrainingRunClosedError();
          }

          const updatedRun =
            await transaction.trainingRun.findUnique({
              where: {
                id: currentRun.id,
              },
            });

          if (updatedRun === null) {
            throw new TrainingRunNotFoundError();
          }

          if (
            updatedRun.answeredExercises
            > updatedRun.totalExercises
          ) {
            throw new TrainingRunInvariantError();
          }

          if (
            updatedRun.answeredExercises
            < updatedRun.totalExercises
          ) {
            return Object.freeze({
              attempt:
                mapTrainingAttempt(attempt),
              run:
                mapTrainingRun(updatedRun),
              completion:
                null,
            });
          }

          const completedAt =
            input.attemptedAt;

          const closed =
            await transaction.trainingRun.updateMany({
              where: {
                id: updatedRun.id,
                userId: updatedRun.userId,
                status: 'ACTIVE',
                answeredExercises:
                  updatedRun.totalExercises,
              },
              data: {
                status: 'COMPLETED',
                completedAt,
              },
            });

          if (closed.count !== 1) {
            throw new TrainingRunClosedError();
          }

          const progress =
            await transaction.conceptProgress.upsert({
              where: {
                userId_conceptId: {
                  userId: updatedRun.userId,
                  conceptId: updatedRun.conceptId,
                },
              },
              create: {
                userId: updatedRun.userId,
                conceptId: updatedRun.conceptId,
                technologyId:
                  updatedRun.technologyId,
                totalAttempts:
                  updatedRun.totalExercises,
                correctAttempts:
                  updatedRun.correctExercises,
                completedSessions: 1,
                lastPracticedAt:
                  completedAt,
              },
              update: {
                totalAttempts: {
                  increment:
                    updatedRun.totalExercises,
                },
                correctAttempts: {
                  increment:
                    updatedRun.correctExercises,
                },
                completedSessions: {
                  increment: 1,
                },
              },
            });

          if (
            progress.technologyId
            !== updatedRun.technologyId
          ) {
            throw new TrainingRunInvariantError();
          }

          await transaction.conceptProgress.updateMany({
            where: {
              userId: updatedRun.userId,
              conceptId: updatedRun.conceptId,
              lastPracticedAt: {
                lt: completedAt,
              },
            },
            data: {
              lastPracticedAt:
                completedAt,
            },
          });

          const completion =
            await transaction.completedSession.create({
              data: {
                userId: updatedRun.userId,
                trainingRunId:
                  updatedRun.id,
                sessionId:
                  updatedRun.sessionId,
                technologyId:
                  updatedRun.technologyId,
                topicId:
                  updatedRun.topicId,
                conceptId:
                  updatedRun.conceptId,
                totalExercises:
                  updatedRun.totalExercises,
                correctExercises:
                  updatedRun.correctExercises,
                durationMs:
                  updatedRun.durationMs,
                hintsUsed:
                  updatedRun.hintsUsed,
                completedAt,
              },
            });

          const completedRun =
            await transaction.trainingRun.findUnique({
              where: {
                id: updatedRun.id,
              },
            });

          if (completedRun === null) {
            throw new TrainingRunNotFoundError();
          }

          return Object.freeze({
            attempt:
              mapTrainingAttempt(attempt),
            run:
              mapTrainingRun(completedRun),
            completion:
              mapTrainingCompletion(
                completion,
              ),
          });
        },
      );
    } catch (error) {
      if (
        isPrismaUniqueConstraintError(
          error,
        )
      ) {
        throw new DuplicateTrainingAnswerError();
      }

      throw error;
    }
  }
}

interface PersistedTrainingRun {
  readonly id: string;
  readonly userId: string;
  readonly sessionId: string;
  readonly technologyId: string;
  readonly topicId: string;
  readonly conceptId: string;
  readonly status: string;
  readonly totalExercises: number;
  readonly answeredExercises: number;
  readonly correctExercises: number;
  readonly durationMs: number;
  readonly hintsUsed: number;
  readonly startedAt: Date;
  readonly completedAt: Date | null;
}

function mapTrainingRun(
  record: PersistedTrainingRun,
): TrainingRunRecord {
  if (
    record.status !== 'ACTIVE'
    && record.status !== 'COMPLETED'
  ) {
    throw new TrainingRunInvariantError();
  }

  return Object.freeze({
    id: record.id,
    userId: record.userId,
    sessionId:
      contentSessionIdSchema.parse(
        record.sessionId,
      ),
    technologyId:
      technologyIdSchema.parse(
        record.technologyId,
      ),
    topicId:
      topicIdSchema.parse(
        record.topicId,
      ),
    conceptId:
      conceptIdSchema.parse(
        record.conceptId,
      ),
    status: record.status,
    totalExercises:
      record.totalExercises,
    answeredExercises:
      record.answeredExercises,
    correctExercises:
      record.correctExercises,
    durationMs:
      record.durationMs,
    hintsUsed:
      record.hintsUsed,
    startedAt:
      record.startedAt,
    completedAt:
      record.completedAt,
  });
}

interface PersistedTrainingAttempt {
  readonly id: string;
  readonly exerciseId: string;
  readonly isCorrect: boolean;
  readonly attemptedAt: Date;
  readonly durationMs: number | null;
  readonly hintsUsed: number | null;
}

function mapTrainingAttempt(
  record: PersistedTrainingAttempt,
): TrainingAttemptRecord {
  if (
    record.durationMs === null
    || record.hintsUsed === null
  ) {
    throw new TrainingRunInvariantError();
  }

  return Object.freeze({
    id: record.id,
    exerciseId:
      exerciseIdSchema.parse(
        record.exerciseId,
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

interface PersistedTrainingCompletion {
  readonly id: string;
  readonly completedAt: Date;
  readonly totalExercises: number;
  readonly correctExercises: number;
  readonly durationMs: number;
  readonly hintsUsed: number;
}

function mapTrainingCompletion(
  record: PersistedTrainingCompletion,
): TrainingCompletionRecord {
  return Object.freeze({
    id: record.id,
    completedAt:
      record.completedAt,
    totalExercises:
      record.totalExercises,
    correctExercises:
      record.correctExercises,
    durationMs:
      record.durationMs,
    hintsUsed:
      record.hintsUsed,
  });
}

function isPrismaUniqueConstraintError(
  error: unknown,
): boolean {
  return (
    typeof error === 'object'
    && error !== null
    && 'code' in error
    && error.code === 'P2002'
  );
}

async function lockOwnedTrainingRun(
  transaction: {
    $queryRaw<T>(
      query: TemplateStringsArray,
      ...values: unknown[]
    ): Promise<T>;
  },
  userId: string,
  runId: string,
): Promise<void> {
  await transaction.$queryRaw<
    readonly { readonly id: string }[]
  >`
    SELECT id
    FROM training_runs
    WHERE id = ${runId}
      AND user_id = ${userId}
    FOR UPDATE
  `;
}

export class TrainingRunNotFoundError
extends Error {
  public constructor() {
    super('Training run was not found');
    this.name =
      'TrainingRunNotFoundError';
  }
}

export class TrainingRunClosedError
extends Error {
  public constructor() {
    super('Training run is closed');
    this.name =
      'TrainingRunClosedError';
  }
}

export class TrainingExerciseOutOfOrderError
extends Error {
  public constructor() {
    super('Training exercise is out of order');
    this.name =
      'TrainingExerciseOutOfOrderError';
  }
}

export class TrainingHintsExhaustedError
extends Error {
  public constructor() {
    super('No training hints remain');
    this.name =
      'TrainingHintsExhaustedError';
  }
}

export class DuplicateTrainingAnswerError
extends Error {
  public constructor() {
    super('Exercise was already answered in this training run');
    this.name =
      'DuplicateTrainingAnswerError';
  }
}

export class TrainingRunInvariantError
extends Error {
  public constructor() {
    super('Training run invariant failed');
    this.name =
      'TrainingRunInvariantError';
  }
}
