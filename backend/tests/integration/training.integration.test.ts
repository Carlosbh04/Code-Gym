import {
  randomUUID,
} from 'node:crypto';
import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
} from 'vitest';
import {
  conceptIdSchema,
  contentSessionIdSchema,
  exerciseIdSchema,
  technologyIdSchema,
  topicIdSchema,
} from '../../src/content/content-id.js';
import {
  loadConfig,
} from '../../src/config/load-config.js';
import {
  createDatabaseService,
} from '../../src/database/database-service.js';
import {
  createPrismaClient,
} from '../../src/database/prisma.js';
import {
  DuplicateTrainingAnswerError,
  PrismaTrainingRepository,
} from '../../src/training/training-repository.js';

const config = loadConfig();

if (
  !config.isTest
  || !config.database.name.endsWith(
    '_test',
  )
) {
  throw new Error(
    'DB integration requires NODE_ENV=test and a DB_NAME ending in _test',
  );
}

const prisma =
  createPrismaClient(
    config.database,
  );
const database =
  createDatabaseService(
    prisma,
  );
const repository =
  new PrismaTrainingRepository(
    prisma,
  );

const testId = randomUUID();
const emails: string[] = [];

const sessionId =
  contentSessionIdSchema.parse(
    'js-training-integration-01',
  );
const technologyId =
  technologyIdSchema.parse(
    'javascript',
  );
const topicId =
  topicIdSchema.parse(
    'js-functions',
  );
const conceptId =
  conceptIdSchema.parse(
    'js-function-basics',
  );
const firstExerciseId =
  exerciseIdSchema.parse(
    'step-1',
  );
const secondExerciseId =
  exerciseIdSchema.parse(
    'step-2',
  );

async function createUser(
  label: string,
) {
  const email =
    `t229-${label}-${testId}@example.test`;
  const user =
    await prisma.user.create({
      data: {
        email,
        passwordHash:
          '$test$not-a-real-password-hash',
        displayName:
          `T229 ${label}`,
      },
    });

  emails.push(email);
  return user;
}

describe(
  'T229.4C TrainingRun MySQL integration',
  () => {
    beforeAll(
      async () => {
        await database.connect();
      },
      20_000,
    );

    afterAll(
      async () => {
        try {
          if (emails.length > 0) {
            await prisma.user.deleteMany({
              where: {
                email: {
                  in: emails,
                },
              },
            });
          }
        } finally {
          await database.disconnect();
        }
      },
      20_000,
    );

    it(
      'isolates run ownership and atomically finalizes completion plus ConceptProgress',
      async () => {
        const owner =
          await createUser('owner');
        const foreign =
          await createUser('foreign');
        const startedAt =
          new Date(
            '2026-09-12T08:00:00.000Z',
          );

        const run =
          await repository.createRun({
            userId: owner.id,
            sessionId,
            technologyId,
            topicId,
            conceptId,
            totalExercises: 2,
            startedAt,
          });

        await expect(
          repository.findOwnedRun(
            foreign.id,
            run.id,
          ),
        ).resolves.toBeNull();

        const first =
          await repository
            .recordScoredAnswerAndMaybeComplete({
              userId: owner.id,
              runId: run.id,
              exerciseId:
                firstExerciseId,
              exercisePosition: 0,
              isCorrect: true,
              durationMs: 1000,
              attemptedAt:
                new Date(
                  '2026-09-12T08:01:00.000Z',
                ),
            });

        expect(first.run.status)
          .toBe('ACTIVE');
        expect(first.completion)
          .toBeNull();

        await repository.revealNextHint({
          userId: owner.id,
          runId: run.id,
          exerciseId: secondExerciseId,
          exercisePosition: 1,
          totalHints: 2,
          revealedAt: new Date(
            '2026-09-12T08:01:30.000Z',
          ),
        });

        const second =
          await repository
            .recordScoredAnswerAndMaybeComplete({
              userId: owner.id,
              runId: run.id,
              exerciseId:
                secondExerciseId,
              exercisePosition: 1,
              isCorrect: false,
              durationMs: 2000,
              attemptedAt:
                new Date(
                  '2026-09-12T08:02:00.000Z',
                ),
            });

        expect(second.run.status)
          .toBe('COMPLETED');
        expect(second.run.answeredExercises)
          .toBe(2);
        expect(second.run.correctExercises)
          .toBe(1);
        expect(second.run.durationMs)
          .toBe(3000);
        expect(second.run.hintsUsed)
          .toBe(1);
        expect(second.completion)
          .toMatchObject({
            totalExercises: 2,
            correctExercises: 1,
            durationMs: 3000,
            hintsUsed: 1,
          });

        const completion =
          await prisma.completedSession
            .findUnique({
              where: {
                trainingRunId:
                  run.id,
              },
            });
        const progress =
          await prisma.conceptProgress
            .findUnique({
              where: {
                userId_conceptId: {
                  userId: owner.id,
                  conceptId,
                },
              },
            });

        expect(completion)
          .not.toBeNull();
        expect(progress)
          .toMatchObject({
            totalAttempts: 2,
            correctAttempts: 1,
            completedSessions: 1,
          });
      },
    );

    it(
      'rejects replay of the same exercise inside one run without incrementing counters twice',
      async () => {
        const user =
          await createUser('replay');
        const run =
          await repository.createRun({
            userId: user.id,
            sessionId,
            technologyId,
            topicId,
            conceptId,
            totalExercises: 2,
            startedAt:
              new Date(
                '2026-09-12T09:00:00.000Z',
              ),
          });

        const input = {
          userId: user.id,
          runId: run.id,
          exerciseId:
            firstExerciseId,
          exercisePosition: 0,
          isCorrect: true,
          durationMs: 100,
          attemptedAt:
            new Date(
              '2026-09-12T09:01:00.000Z',
            ),
        } as const;

        await repository
          .recordScoredAnswerAndMaybeComplete(
            input,
          );

        await expect(
          repository
            .recordScoredAnswerAndMaybeComplete(
              input,
            ),
        ).rejects.toBeInstanceOf(
          DuplicateTrainingAnswerError,
        );

        const stored =
          await prisma.trainingRun
            .findUniqueOrThrow({
              where: {
                id: run.id,
              },
            });

        expect(stored.answeredExercises)
          .toBe(1);
        expect(stored.correctExercises)
          .toBe(1);
      },
    );
  },
);
