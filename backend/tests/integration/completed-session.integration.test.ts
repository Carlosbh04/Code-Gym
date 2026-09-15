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
  PrismaCompletedSessionRepository,
} from '../../src/progress/completed-session-repository.js';

import {
  CompletedSessionService,
} from '../../src/progress/completed-session-service.js';

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
  new PrismaCompletedSessionRepository(
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

async function createUser(
  label: string,
) {
  const email =
    `t223-${label}-${runId}@example.test`;

  const user =
    await prisma.user.create({
      data: {
        email,

        passwordHash:
          '$test$not-a-real-password-hash',

        displayName:
          `T223 ${label}`,
      },
    });

  emails.push(
    email,
  );

  return user;
}

describe(
  'T223 completed sessions MySQL integration',
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
      'persists a canonical completion and its progress projection',
      async () => {
        const user =
          await createUser(
            'persist',
          );

        const completedAt =
          new Date(
            '2026-09-12T07:00:00.000Z',
          );

        const service =
          new CompletedSessionService(
            repository,
            () => completedAt,
          );

        const result =
          await service
            .recordTrustedCompletion({
              userId:
                user.id,

              sessionId,

              technologyId,

              topicId,

              conceptId,

              totalExercises:
                4,

              correctExercises:
                3,

              durationMs:
                32_000,

              hintsUsed:
                1,
            });

        expect(
          result.completedSession.conceptId,
        ).toBe(
          conceptId,
        );

        expect(
          result.completedSession.accuracy,
        ).toBe(
          0.75,
        );

        expect(
          result.conceptProgress,
        ).toMatchObject({
          conceptId,

          totalAttempts:
            4,

          correctAttempts:
            3,

          completedSessions:
            1,

          accuracy:
            0.75,
        });
      },
    );

    it(
      'enforces ownership when two users complete the same session',
      async () => {
        const first =
          await createUser(
            'owner-a',
          );

        const second =
          await createUser(
            'owner-b',
          );

        await repository
          .createCompletedSessionAndUpdateProgress({
            userId:
              first.id,

            sessionId,

            technologyId,

            topicId,

            conceptId,

            totalExercises:
              4,

            correctExercises:
              2,

            durationMs:
              20_000,

            hintsUsed:
              0,

            completedAt:
              new Date(
                '2026-09-12T08:00:00.000Z',
              ),
          });

        await repository
          .createCompletedSessionAndUpdateProgress({
            userId:
              second.id,

            sessionId,

            technologyId,

            topicId,

            conceptId,

            totalExercises:
              4,

            correctExercises:
              4,

            durationMs:
              15_000,

            hintsUsed:
              0,

            completedAt:
              new Date(
                '2026-09-12T09:00:00.000Z',
              ),
          });

        const firstOwned =
          await repository
            .findLatestByUserAndSessionId(
              first.id,
              sessionId,
            );

        const secondOwned =
          await repository
            .findLatestByUserAndSessionId(
              second.id,
              sessionId,
            );

        expect(
          firstOwned?.correctExercises,
        ).toBe(
          2,
        );

        expect(
          secondOwned?.correctExercises,
        ).toBe(
          4,
        );
      },
    );

    it(
      'returns the latest completion when one user repeats a session',
      async () => {
        const user =
          await createUser(
            'latest',
          );

        await repository
          .createCompletedSessionAndUpdateProgress({
            userId:
              user.id,

            sessionId,

            technologyId,

            topicId,

            conceptId,

            totalExercises:
              4,

            correctExercises:
              1,

            durationMs:
              40_000,

            hintsUsed:
              2,

            completedAt:
              new Date(
                '2026-09-12T06:00:00.000Z',
              ),
          });

        const latest =
          await repository
            .createCompletedSessionAndUpdateProgress({
              userId:
                user.id,

              sessionId,

              technologyId,

              topicId,

              conceptId,

              totalExercises:
                4,

              correctExercises:
                4,

              durationMs:
                20_000,

              hintsUsed:
                0,

              completedAt:
                new Date(
                  '2026-09-12T10:00:00.000Z',
                ),
            });

        const result =
          await repository
            .findLatestByUserAndSessionId(
              user.id,
              sessionId,
            );

        expect(
          result?.id,
        ).toBe(
          latest.completedSession.id,
        );
      },
    );

    it(
      'lists only the requested user completion history',
      async () => {
        const owner =
          await createUser(
            'recent-owner',
          );

        const foreign =
          await createUser(
            'recent-foreign',
          );

        const first =
          await repository
            .createCompletedSessionAndUpdateProgress({
              userId:
                owner.id,

              sessionId,

              technologyId,

              topicId,

              conceptId,

              totalExercises:
                4,

              correctExercises:
                2,

              durationMs:
                30_000,

              hintsUsed:
                1,

              completedAt:
                new Date(
                  '2026-09-12T11:00:00.000Z',
                ),
            });

        const second =
          await repository
            .createCompletedSessionAndUpdateProgress({
              userId:
                owner.id,

              sessionId,

              technologyId,

              topicId,

              conceptId,

              totalExercises:
                4,

              correctExercises:
                3,

              durationMs:
                25_000,

              hintsUsed:
                0,

              completedAt:
                new Date(
                  '2026-09-12T12:00:00.000Z',
                ),
            });

        await repository
          .createCompletedSessionAndUpdateProgress({
            userId:
              foreign.id,

            sessionId,

            technologyId,

            topicId,

            conceptId,

            totalExercises:
              4,

            correctExercises:
              4,

            durationMs:
              10_000,

            hintsUsed:
              0,

            completedAt:
              new Date(
                '2026-09-12T13:00:00.000Z',
              ),
          });

        const records =
          await repository
            .findRecentByUserId(
              owner.id,
              10,
            );

        expect(
          records.map(
            ({ id }) =>
              id,
          ),
        ).toEqual([
          second.completedSession.id,
          first.completedSession.id,
        ]);

        expect(
          records.every(
            ({ userId }) =>
              userId === owner.id,
          ),
        ).toBe(
          true,
        );
      },
    );
  },
);
