import { randomUUID } from 'node:crypto';
import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
} from 'vitest';

import {
  contentSessionIdSchema,
  exerciseIdSchema,
  technologyIdSchema,
  topicIdSchema,
  conceptIdSchema,
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
  PrismaTrainingRepository,
  TrainingRunNotFoundError,
} from '../../src/training/training-repository.js';

import {
  PrismaAttemptRepository,
} from '../../src/progress/attempt-repository.js';

import {
  PrismaCompletedSessionRepository,
} from '../../src/progress/completed-session-repository.js';


const config = loadConfig();

if (
  !config.isTest
  || !config.database.name.endsWith('_test')
) {
  throw new Error(
    'T230 isolation integration requires NODE_ENV=test and DB_NAME ending in _test',
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

const trainingRepository =
  new PrismaTrainingRepository(
    prisma,
  );

const attemptRepository =
  new PrismaAttemptRepository(
    prisma,
  );

const completedSessionRepository =
  new PrismaCompletedSessionRepository(
    prisma,
  );


const testId =
  randomUUID();

const emails:
  string[] = [];


const sessionId =
  contentSessionIdSchema.parse(
    'js-t230-isolation-01',
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
    `t230-${label}-${testId}@example.test`;

  const user =
    await prisma.user.create({
      data: {
        email,
        passwordHash:
          '$test$not-a-real-password-hash',
        displayName:
          `T230 ${label}`,
      },
    });

  emails.push(email);

  return user;
}


describe(
  'T230 cross-user isolation',
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
      'prevents user B from recording an answer into user A training run',
      async () => {
        const owner =
          await createUser(
            'training-owner',
          );

        const attacker =
          await createUser(
            'training-attacker',
          );

        const run =
          await trainingRepository
            .createRun({
              userId:
                owner.id,
              sessionId,
              technologyId,
              topicId,
              conceptId,
              totalExercises:
                2,
              startedAt:
                new Date(
                  '2026-09-13T10:00:00.000Z',
                ),
            });


        await expect(
          trainingRepository
            .recordScoredAnswerAndMaybeComplete({
              userId:
                attacker.id,
              runId:
                run.id,
              exerciseId:
                firstExerciseId,
              exercisePosition:
                0,
              isCorrect:
                true,
              durationMs:
                100,
              attemptedAt:
                new Date(
                  '2026-09-13T10:01:00.000Z',
                ),
            }),
        ).rejects.toBeInstanceOf(
          TrainingRunNotFoundError,
        );


        const storedRun =
          await prisma.trainingRun
            .findUniqueOrThrow({
              where: {
                id:
                  run.id,
              },
            });

        expect(
          storedRun.userId,
        ).toBe(
          owner.id,
        );

        expect(
          storedRun.answeredExercises,
        ).toBe(0);

        expect(
          storedRun.correctExercises,
        ).toBe(0);


        const attempts =
          await prisma.attempt
            .findMany({
              where: {
                trainingRunId:
                  run.id,
              },
            });

        expect(
          attempts,
        ).toEqual([]);


        const completion =
          await prisma.completedSession
            .findUnique({
              where: {
                trainingRunId:
                  run.id,
              },
            });

        expect(
          completion,
        ).toBeNull();


        const progress =
          await prisma.conceptProgress
            .findUnique({
              where: {
                userId_conceptId: {
                  userId:
                    owner.id,
                  conceptId,
                },
              },
            });

        expect(
          progress,
        ).toBeNull();
      },
    );


    it(
      'isolates attempts with the same sessionId between users',
      async () => {
        const owner =
          await createUser(
            'attempt-owner',
          );

        const foreign =
          await createUser(
            'attempt-foreign',
          );


        await prisma.attempt.createMany({
          data: [
            {
              userId:
                owner.id,
              sessionId,
              exerciseId:
                firstExerciseId,
              conceptId,
              technologyId,
              isCorrect:
                true,
              attemptedAt:
                new Date(
                  '2026-09-13T11:00:00.000Z',
                ),
              durationMs:
                100,
              hintsUsed:
                0,
            },
            {
              userId:
                foreign.id,
              sessionId,
              exerciseId:
                secondExerciseId,
              conceptId,
              technologyId,
              isCorrect:
                false,
              attemptedAt:
                new Date(
                  '2026-09-13T11:01:00.000Z',
                ),
              durationMs:
                200,
              hintsUsed:
                1,
            },
          ],
        });


        const ownerAttempts =
          await attemptRepository
            .findByUserAndSessionId(
              owner.id,
              sessionId,
            );


        expect(
          ownerAttempts,
        ).toHaveLength(1);

        expect(
          ownerAttempts[0]
            ?.userId,
        ).toBe(
          owner.id,
        );

        expect(
          ownerAttempts[0]
            ?.exerciseId,
        ).toBe(
          firstExerciseId,
        );

        expect(
          JSON.stringify(
            ownerAttempts,
          ),
        ).not.toContain(
          secondExerciseId,
        );
      },
    );


    it(
      'isolates latest completion with the same sessionId between users',
      async () => {
        const owner =
          await createUser(
            'completion-owner',
          );

        const foreign =
          await createUser(
            'completion-foreign',
          );


        await prisma.completedSession
          .createMany({
            data: [
              {
                userId:
                  owner.id,
                sessionId,
                technologyId,
                topicId,
                conceptId,
                totalExercises:
                  2,
                correctExercises:
                  1,
                durationMs:
                  1000,
                hintsUsed:
                  0,
                completedAt:
                  new Date(
                    '2026-09-13T12:00:00.000Z',
                  ),
              },
              {
                userId:
                  foreign.id,
                sessionId,
                technologyId,
                topicId,
                conceptId,
                totalExercises:
                  2,
                correctExercises:
                  2,
                durationMs:
                  500,
                hintsUsed:
                  0,
                completedAt:
                  new Date(
                    '2026-09-13T12:01:00.000Z',
                  ),
              },
            ],
          });


        const completion =
          await completedSessionRepository
            .findLatestByUserAndSessionId(
              owner.id,
              sessionId,
            );


        expect(
          completion,
        ).not.toBeNull();

        expect(
          completion?.userId,
        ).toBe(
          owner.id,
        );

        expect(
          completion?.correctExercises,
        ).toBe(1);
      },
    );


    it(
      'selects attempts from the latest completed TrainingRun without mixing users',
      async () => {
        const owner =
          await createUser(
            'repeat-owner',
          );

        const foreign =
          await createUser(
            'repeat-foreign',
          );


        const firstRun =
          await trainingRepository
            .createRun({
              userId:
                owner.id,
              sessionId,
              technologyId,
              topicId,
              conceptId,
              totalExercises:
                1,
              startedAt:
                new Date(
                  '2026-09-13T13:00:00.000Z',
                ),
            });

        await trainingRepository
          .recordScoredAnswerAndMaybeComplete({
            userId:
              owner.id,
            runId:
              firstRun.id,
            exerciseId:
              firstExerciseId,
            exercisePosition:
              0,
            isCorrect:
              false,
            durationMs:
              1000,
            attemptedAt:
              new Date(
                '2026-09-13T13:01:00.000Z',
              ),
          });


        const secondRun =
          await trainingRepository
            .createRun({
              userId:
                owner.id,
              sessionId,
              technologyId,
              topicId,
              conceptId,
              totalExercises:
                1,
              startedAt:
                new Date(
                  '2026-09-13T13:10:00.000Z',
                ),
            });

        await trainingRepository
          .recordScoredAnswerAndMaybeComplete({
            userId:
              owner.id,
            runId:
              secondRun.id,
            exerciseId:
              firstExerciseId,
            exercisePosition:
              0,
            isCorrect:
              true,
            durationMs:
              500,
            attemptedAt:
              new Date(
                '2026-09-13T13:11:00.000Z',
              ),
          });


        await prisma.attempt.create({
          data: {
            userId:
              foreign.id,
            sessionId,
            exerciseId:
              secondExerciseId,
            conceptId,
            technologyId,
            isCorrect:
              true,
            attemptedAt:
              new Date(
                '2026-09-13T13:12:00.000Z',
              ),
            durationMs:
              1,
            hintsUsed:
              0,
          },
        });


        const latestCompletion =
          await completedSessionRepository
            .findLatestByUserAndSessionId(
              owner.id,
              sessionId,
            );

        expect(
          latestCompletion,
        ).not.toBeNull();

        expect(
          latestCompletion
            ?.correctExercises,
        ).toBe(1);

        expect(
          latestCompletion
            ?.trainingRunId,
        ).toBe(
          secondRun.id,
        );

        const latestRunAttempts =
          await attemptRepository
            .findByUserAndTrainingRunId(
              owner.id,
              secondRun.id,
            );

        expect(
          latestRunAttempts,
        ).toHaveLength(1);

        expect(
          latestRunAttempts[0]
            ?.isCorrect,
        ).toBe(true);

        expect(
          latestRunAttempts[0]
            ?.userId,
        ).toBe(
          owner.id,
        );

        expect(
          JSON.stringify(
            latestRunAttempts,
          ),
        ).not.toContain(
          secondExerciseId,
        );

        const allOwnerAttempts =
          await attemptRepository
            .findByUserAndSessionId(
              owner.id,
              sessionId,
            );

        expect(
          allOwnerAttempts,
        ).toHaveLength(2);
      },
    );
  },
);
