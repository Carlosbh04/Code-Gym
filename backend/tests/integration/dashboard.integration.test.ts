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
  CompletedSessionService,
} from '../../src/progress/completed-session-service.js';

import {
  PrismaCompletedSessionRepository,
} from '../../src/progress/completed-session-repository.js';

import {
  ConceptProgressService,
} from '../../src/progress/concept-progress-service.js';

import {
  PrismaConceptProgressRepository,
} from '../../src/progress/concept-progress-repository.js';

import {
  DashboardService,
} from '../../src/progress/dashboard-service.js';

import {
  ReviewService,
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

const progressRepository =
  new PrismaConceptProgressRepository(
    prisma,
  );

const completedSessionRepository =
  new PrismaCompletedSessionRepository(
    prisma,
  );

const dashboardService =
  new DashboardService(
    new ConceptProgressService(
      progressRepository,
    ),

    new CompletedSessionService(
      completedSessionRepository,
    ),

    new ReviewService(
      progressRepository,
      {
        sufficientEvidenceAttempts:
          5,

        targetAccuracy:
          0.8,

        maximumCandidates:
          4,
      },
    ),

    new BadgeService(
      progressRepository,
      {
        accuracyBadgeMinimumAttempts:
          5,
      },
    ),

    10,
  );

const runId =
  randomUUID();

const emails:
  string[] = [];

async function createUser(
  label: string,
) {
  const email =
    `t228-${label}-${runId}@example.test`;

  const user =
    await prisma.user.create({
      data: {
        email,

        passwordHash:
          '$test$not-a-real-password-hash',

        displayName:
          `T228 ${label}`,
      },
    });

  emails.push(
    email,
  );

  return user;
}

describe(
  'T228 dashboard MySQL integration',
  () => {
    beforeAll(
      async () => {
        await database
          .connect();
      },
      20_000,
    );

    afterAll(
      async () => {
        try {
          if (
            emails.length > 0
          ) {
            await prisma.user
              .deleteMany({
                where: {
                  email: {
                    in:
                      emails,
                  },
                },
              });
          }
        } finally {
          await database
            .disconnect();
        }
      },
      20_000,
    );

    it(
      'returns only the requested users progress and completion history',
      async () => {
        const owner =
          await createUser(
            'owner',
          );

        const foreign =
          await createUser(
            'foreign',
          );

        await prisma
          .conceptProgress
          .createMany({
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
                    '2026-09-10T10:00:00.000Z',
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
            ],
          });

        await prisma
          .completedSession
          .createMany({
            data: [
              {
                userId:
                  owner.id,

                sessionId:
                  'js-arrays-map-vs-foreach-01',

                technologyId:
                  'javascript',

                topicId:
                  'js-arrays',

                conceptId:
                  'js-array-iteration',

                totalExercises:
                  5,

                correctExercises:
                  3,

                durationMs:
                  50_000,

                hintsUsed:
                  1,

                completedAt:
                  new Date(
                    '2026-09-10T10:00:00.000Z',
                  ),
              },
              {
                userId:
                  foreign.id,

                sessionId:
                  'js-promises-await-value-01',

                technologyId:
                  'javascript',

                topicId:
                  'js-promises',

                conceptId:
                  'js-promise-flow',

                totalExercises:
                  5,

                correctExercises:
                  5,

                durationMs:
                  40_000,

                hintsUsed:
                  0,

                completedAt:
                  new Date(
                    '2026-09-11T10:00:00.000Z',
                  ),
              },
            ],
          });

        const result =
          await dashboardService
            .getDashboard(
              owner.id,
            );

        expect(
          result.progress,
        ).toHaveLength(
          1,
        );

        expect(
          result.progress[0]
            ?.conceptId,
        ).toBe(
          'js-array-iteration',
        );

        expect(
          result
            .recentCompletedSessions,
        ).toHaveLength(
          1,
        );

        expect(
          result
            .recentCompletedSessions[0]
            ?.sessionId,
        ).toBe(
          'js-arrays-map-vs-foreach-01',
        );

        expect(
          JSON.stringify(
            result,
          ),
        ).not.toContain(
          'js-promise-flow',
        );
      },
    );

    it(
      'derives review and badges from the same authenticated users data',
      async () => {
        const user =
          await createUser(
            'derived',
          );

        await prisma
          .conceptProgress
          .create({
            data: {
              userId:
                user.id,

              conceptId:
                'js-function-basics',

              technologyId:
                'javascript',

              totalAttempts:
                10,

              correctAttempts:
                5,

              completedSessions:
                5,

              lastPracticedAt:
                new Date(
                  '2026-09-09T10:00:00.000Z',
                ),
            },
          });

        const result =
          await dashboardService
            .getDashboard(
              user.id,
            );

        expect(
          result.review
            .candidates[0]
            ?.conceptId,
        ).toBe(
          'js-function-basics',
        );

        expect(
          result.review
            .candidates[0]
            ?.reason,
        ).toBe(
          'low-accuracy',
        );

        expect(
          result.badges
            .badges
            .find(
              (
                badge,
              ) =>
                badge.id
                === 'five-sessions',
            )
            ?.unlocked,
        ).toBe(
          true,
        );

        expect(
          result.badges
            .badges
            .find(
              (
                badge,
              ) =>
                badge.id
                === 'accuracy-80',
            )
            ?.unlocked,
        ).toBe(
          false,
        );
      },
    );

    it(
      'returns a clean empty dashboard for a new user',
      async () => {
        const user =
          await createUser(
            'empty',
          );

        const result =
          await dashboardService
            .getDashboard(
              user.id,
            );

        expect(
          result.progress,
        ).toEqual(
          [],
        );

        expect(
          result
            .recentCompletedSessions,
        ).toEqual(
          [],
        );

        expect(
          result.review
            .overview,
        ).toEqual({
          totalAttempts:
            0,

          correctAttempts:
            0,

          accuracy:
            null,

          evidenceLevel:
            'none',
        });

        expect(
          result.badges
            .badges
            .every(
              (
                badge,
              ) =>
                !badge.unlocked,
            ),
        ).toBe(
          true,
        );
      },
    );
  },
);
