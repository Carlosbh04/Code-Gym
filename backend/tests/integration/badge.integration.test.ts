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
  loadConfig,
} from '../../src/config/load-config.js';

import {
  createDatabaseService,
} from '../../src/database/database-service.js';

import {
  createPrismaClient,
} from '../../src/database/prisma.js';

import {
  BadgeService,
} from '../../src/progress/badge-service.js';

import {
  PrismaConceptProgressRepository,
} from '../../src/progress/concept-progress-repository.js';

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

const service =
  new BadgeService(
    repository,
    {
      accuracyBadgeMinimumAttempts:
        10,
    },
  );

const runId =
  randomUUID();

const emails:
  string[] = [];

async function createUser(
  label: string,
) {
  const email =
    `t227-${label}-${runId}@example.test`;

  const user =
    await prisma.user.create({
      data: {
        email,

        passwordHash:
          '$test$not-a-real-password-hash',

        displayName:
          `T227 ${label}`,
      },
    });

  emails.push(
    email,
  );

  return user;
}

describe(
  'T227 badges MySQL integration',
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
      'derives badges from the requested user persisted ConceptProgress',
      async () => {
        const user =
          await createUser(
            'derived',
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
                60,

              correctAttempts:
                50,

              completedSessions:
                6,

              lastPracticedAt:
                new Date(
                  '2026-09-10T10:00:00.000Z',
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
                40,

              correctAttempts:
                30,

              completedSessions:
                4,

              lastPracticedAt:
                new Date(
                  '2026-09-11T10:00:00.000Z',
                ),
            },
          ],
        });

        const result =
          await service
            .getBadges(
              user.id,
            );

        expect(
          result.summary,
        ).toEqual({
          totalAttempts:
            100,

          correctAttempts:
            80,

          completedSessions:
            10,

          accuracy:
            0.8,
        });

        expect(
          result.badges
            .filter(
              ({
                unlocked,
              }) =>
                unlocked,
            )
            .map(
              ({
                id,
              }) =>
                id,
            ),
        ).toEqual([
          'first-session',
          'five-sessions',
          'ten-sessions',
          'fifty-attempts',
          'hundred-attempts',
          'accuracy-80',
        ]);
      },
    );

    it(
      'isolates badges between users',
      async () => {
        const owner =
          await createUser(
            'owner',
          );

        const foreign =
          await createUser(
            'foreign',
          );

        await prisma.conceptProgress.create({
          data: {
            userId:
              owner.id,

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
                '2026-09-10T10:00:00.000Z',
              ),
          },
        });

        await prisma.conceptProgress.create({
          data: {
            userId:
              foreign.id,

            conceptId:
              'js-promise-flow',

            technologyId:
              'javascript',

            totalAttempts:
              100,

            correctAttempts:
              100,

            completedSessions:
              20,

            lastPracticedAt:
              new Date(
                '2026-09-11T10:00:00.000Z',
              ),
          },
        });

        const result =
          await service
            .getBadges(
              owner.id,
            );

        expect(
          result.summary,
        ).toMatchObject({
          totalAttempts:
            4,

          correctAttempts:
            2,

          completedSessions:
            1,

          accuracy:
            0.5,
        });

        expect(
          result.badges
            .filter(
              ({
                unlocked,
              }) =>
                unlocked,
            )
            .map(
              ({
                id,
              }) =>
                id,
            ),
        ).toEqual([
          'first-session',
        ]);
      },
    );

    it(
      'returns an empty locked badge state for a user without progress',
      async () => {
        const user =
          await createUser(
            'empty',
          );

        const result =
          await service
            .getBadges(
              user.id,
            );

        expect(
          result.summary,
        ).toEqual({
          totalAttempts:
            0,

          correctAttempts:
            0,

          completedSessions:
            0,

          accuracy:
            null,
        });

        expect(
          result.badges.every(
            ({
              unlocked,
            }) =>
              !unlocked,
          ),
        ).toBe(
          true,
        );
      },
    );

    it(
      'does not mutate ConceptProgress while evaluating badges',
      async () => {
        const user =
          await createUser(
            'readonly',
          );

        await prisma.conceptProgress.create({
          data: {
            userId:
              user.id,

            conceptId:
              'js-error-handling',

            technologyId:
              'javascript',

            totalAttempts:
              20,

            correctAttempts:
              17,

            completedSessions:
              3,

            lastPracticedAt:
              new Date(
                '2026-09-09T10:00:00.000Z',
              ),
          },
        });

        const before =
          await prisma.conceptProgress
            .findMany({
              where: {
                userId:
                  user.id,
              },
            });

        await service
          .getBadges(
            user.id,
          );

        const after =
          await prisma.conceptProgress
            .findMany({
              where: {
                userId:
                  user.id,
              },
            });

        expect(
          after,
        ).toEqual(
          before,
        );
      },
    );
  },
);
