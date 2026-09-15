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
  PrismaConceptProgressRepository,
} from '../../src/progress/concept-progress-repository.js';

import {
  ReviewService,
  type ReviewPolicy,
} from '../../src/progress/review-service.js';

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
  new PrismaConceptProgressRepository(
    prisma,
  );

const policy:
  ReviewPolicy = {
    sufficientEvidenceAttempts:
      8,

    targetAccuracy:
      0.8,

    maximumCandidates:
      4,
  };

const runId =
  randomUUID();

const emails:
  string[] = [];

async function createUser(
  label: string,
) {
  const email =
    `t226-${label}-${runId}@example.test`;

  const user =
    await prisma.user.create({
      data: {
        email,

        passwordHash:
          '$test$not-a-real-password-hash',

        displayName:
          `T226 ${label}`,
      },
    });

  emails.push(
    email,
  );

  return user;
}

describe(
  'T226 review/repetition MySQL integration',
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
      'builds priorities only from progress owned by the requested user',
      async () => {
        const owner =
          await createUser(
            'owner',
          );

        const foreign =
          await createUser(
            'foreign',
          );

        await prisma.conceptProgress.createMany({
          data: [
            {
              userId:
                owner.id,

              conceptId:
                'js-array-iteration',

              technologyId:
                'javascript',

              totalAttempts:
                10,

              correctAttempts:
                5,

              completedSessions:
                2,

              lastPracticedAt:
                new Date(
                  '2026-09-01T10:00:00.000Z',
                ),
            },
            {
              userId:
                owner.id,

              conceptId:
                'js-function-basics',

              technologyId:
                'javascript',

              totalAttempts:
                10,

              correctAttempts:
                9,

              completedSessions:
                2,

              lastPracticedAt:
                new Date(
                  '2026-09-02T10:00:00.000Z',
                ),
            },
            {
              userId:
                foreign.id,

              conceptId:
                'js-promise-flow',

              technologyId:
                'javascript',

              totalAttempts:
                10,

              correctAttempts:
                1,

              completedSessions:
                1,

              lastPracticedAt:
                new Date(
                  '2026-08-01T10:00:00.000Z',
                ),
            },
          ],
        });

        const service =
          new ReviewService(
            repository,
            policy,
          );

        const result =
          await service
            .getReviewPlan(
              owner.id,
            );

        expect(
          result.overview,
        ).toMatchObject({
          totalAttempts:
            20,

          correctAttempts:
            14,

          accuracy:
            0.7,
        });

        expect(
          result.candidates.map(
            ({
              conceptId,
            }) =>
              conceptId,
          ),
        ).toEqual([
          conceptIdSchema.parse(
            'js-array-iteration',
          ),
        ]);

        expect(
          result.candidates.some(
            ({
              conceptId,
            }) =>
              conceptId
              === conceptIdSchema.parse(
                'js-promise-flow',
              ),
          ),
        ).toBe(
          false,
        );
      },
    );

    it(
      'prioritizes weaker progress without mutating persisted aggregates',
      async () => {
        const user =
          await createUser(
            'ranking',
          );

        await prisma.conceptProgress.createMany({
          data: [
            {
              userId:
                user.id,

              conceptId:
                'js-array-iteration',

              technologyId:
                'javascript',

              totalAttempts:
                4,

              correctAttempts:
                2,

              completedSessions:
                1,

              lastPracticedAt:
                new Date(
                  '2026-09-05T10:00:00.000Z',
                ),
            },
            {
              userId:
                user.id,

              conceptId:
                'js-function-basics',

              technologyId:
                'javascript',

              totalAttempts:
                6,

              correctAttempts:
                3,

              completedSessions:
                1,

              lastPracticedAt:
                new Date(
                  '2026-09-01T10:00:00.000Z',
                ),
            },
          ],
        });

        const before =
          await prisma.conceptProgress.findMany({
            where: {
              userId:
                user.id,
            },

            orderBy: {
              conceptId:
                'asc',
            },
          });

        const service =
          new ReviewService(
            repository,
            policy,
          );

        const result =
          await service
            .getReviewPlan(
              user.id,
            );

        expect(
          result.candidates.map(
            ({
              conceptId,
            }) =>
              conceptId,
          ),
        ).toEqual([
          conceptIdSchema.parse(
            'js-array-iteration',
          ),
          conceptIdSchema.parse(
            'js-function-basics',
          ),
        ]);

        const after =
          await prisma.conceptProgress.findMany({
            where: {
              userId:
                user.id,
            },

            orderBy: {
              conceptId:
                'asc',
            },
          });

        expect(
          after,
        ).toEqual(
          before,
        );
      },
    );

    it(
      'returns an empty review state for a user without progress',
      async () => {
        const user =
          await createUser(
            'empty',
          );

        const service =
          new ReviewService(
            repository,
            policy,
          );

        await expect(
          service
            .getReviewPlan(
              user.id,
            ),
        ).resolves.toEqual({
          overview: {
            totalAttempts:
              0,

            correctAttempts:
              0,

            accuracy:
              null,

            evidenceLevel:
              'none',
          },

          candidates:
            [],
        });
      },
    );
  },
);
