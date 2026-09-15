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
  PrismaAttemptRepository,
} from '../../src/progress/attempt-repository.js';

import {
  AttemptService,
} from '../../src/progress/attempt-service.js';

const config =
  loadConfig();

if (
  !config.isTest
  || !config.database.name
    .endsWith(
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
  new PrismaAttemptRepository(
    prisma,
  );

const runId =
  randomUUID();

const emails:
  string[] = [];

const sessionId =
  contentSessionIdSchema.parse(
    'js-functions-return-flow-01',
  );

const secondSessionId =
  contentSessionIdSchema.parse(
    'js-functions-return-flow-02',
  );

const conceptId =
  conceptIdSchema.parse(
    'js-function-basics',
  );

const technologyId =
  technologyIdSchema.parse(
    'javascript',
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
    `t225-${label}-${runId}@example.test`;

  const user =
    await prisma.user.create({
      data: {
        email,

        passwordHash:
          '$test$not-a-real-password-hash',

        displayName:
          `T225 ${label}`,
      },
    });

  emails.push(
    email,
  );

  return user;
}

describe(
  'T225 Attempt MySQL integration',
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
          if (
            emails.length > 0
          ) {
            await prisma.user.deleteMany({
              where: {
                email: {
                  in:
                    emails,
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
      'persists a canonical trusted attempt',
      async () => {
        const user =
          await createUser(
            'persist',
          );

        const attemptedAt =
          new Date(
            '2026-09-12T08:00:00.000Z',
          );

        const service =
          new AttemptService(
            repository,
            () => attemptedAt,
          );

        const result =
          await service
            .recordTrustedAttempt({
              userId:
                user.id,

              sessionId,

              exerciseId:
                firstExerciseId,

              conceptId,

              technologyId,

              isCorrect:
                true,

              durationMs:
                1_250,

              hintsUsed:
                1,
            });

        expect(
          result,
        ).toMatchObject({
          sessionId,

          exerciseId:
            firstExerciseId,

          conceptId,

          technologyId,

          isCorrect:
            true,

          attemptedAt:
            attemptedAt
              .toISOString(),

          durationMs:
            1_250,

          hintsUsed:
            1,
        });

        const stored =
          await prisma.attempt
            .findUniqueOrThrow({
              where: {
                id:
                  result.id,
              },
            });

        expect(
          stored.userId,
        ).toBe(
          user.id,
        );

        expect(
          stored.conceptId,
        ).toBe(
          conceptId,
        );
      },
    );

    it(
      'keeps multiple attempts as append-only history ordered chronologically',
      async () => {
        const user =
          await createUser(
            'history',
          );

        const later =
          new Date(
            '2026-09-12T10:00:00.000Z',
          );

        const earlier =
          new Date(
            '2026-09-12T09:00:00.000Z',
          );

        await repository
          .createAttempt({
            userId:
              user.id,

            sessionId,

            exerciseId:
              secondExerciseId,

            conceptId,

            technologyId,

            isCorrect:
              false,

            attemptedAt:
              later,

            durationMs:
              2_000,

            hintsUsed:
              1,
          });

        await repository
          .createAttempt({
            userId:
              user.id,

            sessionId,

            exerciseId:
              firstExerciseId,

            conceptId,

            technologyId,

            isCorrect:
              true,

            attemptedAt:
              earlier,

            durationMs:
              1_000,

            hintsUsed:
              0,
          });

        const records =
          await repository
            .findByUserAndSessionId(
              user.id,
              sessionId,
            );

        expect(
          records.map(
            ({
              exerciseId,
            }) =>
              exerciseId,
          ),
        ).toEqual([
          firstExerciseId,
          secondExerciseId,
        ]);

        expect(
          records,
        ).toHaveLength(
          2,
        );
      },
    );

    it(
      'isolates attempts by owner even when sessionId is identical',
      async () => {
        const first =
          await createUser(
            'owner-a',
          );

        const second =
          await createUser(
            'owner-b',
          );

        const at =
          new Date(
            '2026-09-12T11:00:00.000Z',
          );

        await repository
          .createAttempt({
            userId:
              first.id,

            sessionId,

            exerciseId:
              firstExerciseId,

            conceptId,

            technologyId,

            isCorrect:
              true,

            attemptedAt:
              at,

            durationMs:
              100,

            hintsUsed:
              0,
          });

        await repository
          .createAttempt({
            userId:
              second.id,

            sessionId,

            exerciseId:
              firstExerciseId,

            conceptId,

            technologyId,

            isCorrect:
              false,

            attemptedAt:
              at,

            durationMs:
              200,

            hintsUsed:
              1,
          });

        const firstRecords =
          await repository
            .findByUserAndSessionId(
              first.id,
              sessionId,
            );

        const secondRecords =
          await repository
            .findByUserAndSessionId(
              second.id,
              sessionId,
            );

        expect(
          firstRecords,
        ).toHaveLength(
          1,
        );

        expect(
          secondRecords,
        ).toHaveLength(
          1,
        );

        expect(
          firstRecords[0]?.isCorrect,
        ).toBe(
          true,
        );

        expect(
          secondRecords[0]?.isCorrect,
        ).toBe(
          false,
        );
      },
    );

    it(
      'lists only the requested user recent attempts in descending chronology',
      async () => {
        const owner =
          await createUser(
            'recent-owner',
          );

        const foreign =
          await createUser(
            'recent-foreign',
          );

        await repository
          .createAttempt({
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
                '2026-09-12T08:00:00.000Z',
              ),

            durationMs:
              100,

            hintsUsed:
              0,
          });

        const newest =
          await repository
            .createAttempt({
              userId:
                owner.id,

              sessionId:
                secondSessionId,

              exerciseId:
                secondExerciseId,

              conceptId,

              technologyId,

              isCorrect:
                false,

              attemptedAt:
                new Date(
                  '2026-09-12T12:00:00.000Z',
                ),

              durationMs:
                200,

              hintsUsed:
                1,
            });

        await repository
          .createAttempt({
            userId:
              foreign.id,

            sessionId,

            exerciseId:
              firstExerciseId,

            conceptId,

            technologyId,

            isCorrect:
              true,

            attemptedAt:
              new Date(
                '2026-09-12T13:00:00.000Z',
              ),

            durationMs:
              50,

            hintsUsed:
              0,
          });

        const recent =
          await repository
            .findRecentByUserId(
              owner.id,
              1,
            );

        expect(
          recent,
        ).toHaveLength(
          1,
        );

        expect(
          recent[0]?.id,
        ).toBe(
          newest.id,
        );

        expect(
          recent[0]?.userId,
        ).toBe(
          owner.id,
        );
      },
    );

    it(
      'does not change ConceptProgress when an Attempt is recorded',
      async () => {
        const user =
          await createUser(
            'aggregate',
          );

        const practicedAt =
          new Date(
            '2026-09-12T08:00:00.000Z',
          );

        await prisma.conceptProgress.create({
          data: {
            userId:
              user.id,

            conceptId,

            technologyId,

            totalAttempts:
              4,

            correctAttempts:
              3,

            completedSessions:
              1,

            lastPracticedAt:
              practicedAt,
          },
        });

        const service =
          new AttemptService(
            repository,
            () =>
              new Date(
                '2026-09-12T09:00:00.000Z',
              ),
          );

        await service
          .recordTrustedAttempt({
            userId:
              user.id,

            sessionId,

            exerciseId:
              firstExerciseId,

            conceptId,

            technologyId,

            isCorrect:
              true,

            durationMs:
              1_000,

            hintsUsed:
              0,
          });

        const progress =
          await prisma.conceptProgress
            .findUniqueOrThrow({
              where: {
                userId_conceptId: {
                  userId:
                    user.id,

                  conceptId,
                },
              },
            });

        expect(
          progress.totalAttempts,
        ).toBe(
          4,
        );

        expect(
          progress.correctAttempts,
        ).toBe(
          3,
        );

        expect(
          progress.completedSessions,
        ).toBe(
          1,
        );

        expect(
          progress.lastPracticedAt,
        ).toEqual(
          practicedAt,
        );
      },
    );

    it(
      'preserves legacy attempts whose conceptId is null',
      async () => {
        const user =
          await createUser(
            'legacy',
          );

        await prisma.attempt.create({
          data: {
            userId:
              user.id,

            sessionId,

            exerciseId:
              firstExerciseId,

            conceptId:
              null,

            technologyId,

            isCorrect:
              false,

            attemptedAt:
              new Date(
                '2026-09-12T07:00:00.000Z',
              ),

            durationMs:
              null,

            hintsUsed:
              null,
          },
        });

        const records =
          await repository
            .findByUserAndSessionId(
              user.id,
              sessionId,
            );

        expect(
          records,
        ).toHaveLength(
          1,
        );

        expect(
          records[0]?.conceptId,
        ).toBeNull();

        expect(
          records[0]?.durationMs,
        ).toBeNull();

        expect(
          records[0]?.hintsUsed,
        ).toBeNull();
      },
    );
  },
);
