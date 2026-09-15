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
  ConceptProgressTechnologyMismatchError,
} from '../../src/progress/completed-session-repository.js';

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

const completions =
  new PrismaCompletedSessionRepository(
    prisma,
  );

const progress =
  new PrismaConceptProgressRepository(
    prisma,
  );

const runId =
  randomUUID();

const emails:
  string[] = [];

const conceptId =
  conceptIdSchema.parse(
    'js-function-basics',
  );

const technologyId =
  technologyIdSchema.parse(
    'javascript',
  );

const topicId =
  topicIdSchema.parse(
    'js-functions',
  );

async function createUser(
  label: string,
) {
  const email =
    `t224-${label}-${runId}@example.test`;

  const user =
    await prisma.user.create({
      data: {
        email,

        passwordHash:
          '$test$not-a-real-password-hash',

        displayName:
          `T224 ${label}`,
      },
    });

  emails.push(
    email,
  );

  return user;
}

function completion(
  userId: string,
  sessionSuffix: string,
  completedAt: Date,
  totalExercises: number,
  correctExercises: number,
) {
  return {
    userId,

    sessionId:
      contentSessionIdSchema.parse(
        `js-functions-return-flow-${sessionSuffix}`,
      ),

    technologyId,

    topicId,

    conceptId,

    totalExercises,

    correctExercises,

    durationMs:
      10_000,

    hintsUsed:
      0,

    completedAt,
  };
}

describe(
  'T224 ConceptProgress MySQL integration',
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
      'creates completion and initial aggregate atomically',
      async () => {
        const user =
          await createUser(
            'initial',
          );

        const at =
          new Date(
            '2026-09-12T08:00:00.000Z',
          );

        const result =
          await completions
            .createCompletedSessionAndUpdateProgress(
              completion(
                user.id,
                '01',
                at,
                4,
                3,
              ),
            );

        expect(
          result.conceptProgress,
        ).toMatchObject({
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
            at,
        });

        expect(
          await prisma.completedSession.count({
            where: {
              userId:
                user.id,
            },
          }),
        ).toBe(
          1,
        );

        expect(
          await prisma.conceptProgress.count({
            where: {
              userId:
                user.id,
            },
          }),
        ).toBe(
          1,
        );
      },
    );

    it(
      'accumulates counters rather than accepting absolute replacement state',
      async () => {
        const user =
          await createUser(
            'accumulate',
          );

        await completions
          .createCompletedSessionAndUpdateProgress(
            completion(
              user.id,
              '01',
              new Date(
                '2026-09-12T09:00:00.000Z',
              ),
              4,
              3,
            ),
          );

        const second =
          await completions
            .createCompletedSessionAndUpdateProgress(
              completion(
                user.id,
                '02',
                new Date(
                  '2026-09-12T10:00:00.000Z',
                ),
                5,
                2,
              ),
            );

        expect(
          second.conceptProgress,
        ).toMatchObject({
          totalAttempts:
            9,

          correctAttempts:
            5,

          completedSessions:
            2,
        });
      },
    );

    it(
      'never moves lastPracticedAt backwards for an older completion',
      async () => {
        const user =
          await createUser(
            'chronology',
          );

        const newer =
          new Date(
            '2026-09-12T12:00:00.000Z',
          );

        const older =
          new Date(
            '2026-09-12T11:00:00.000Z',
          );

        await completions
          .createCompletedSessionAndUpdateProgress(
            completion(
              user.id,
              '02',
              newer,
              3,
              2,
            ),
          );

        const result =
          await completions
            .createCompletedSessionAndUpdateProgress(
              completion(
                user.id,
                '01',
                older,
                2,
                1,
              ),
            );

        expect(
          result.conceptProgress.totalAttempts,
        ).toBe(
          5,
        );

        expect(
          result.conceptProgress.correctAttempts,
        ).toBe(
          3,
        );

        expect(
          result.conceptProgress.completedSessions,
        ).toBe(
          2,
        );

        expect(
          result.conceptProgress.lastPracticedAt,
        ).toEqual(
          newer,
        );
      },
    );

    it(
      'isolates the same concept between different users',
      async () => {
        const first =
          await createUser(
            'owner-a',
          );

        const second =
          await createUser(
            'owner-b',
          );

        await completions
          .createCompletedSessionAndUpdateProgress(
            completion(
              first.id,
              '01',
              new Date(
                '2026-09-12T10:00:00.000Z',
              ),
              4,
              1,
            ),
          );

        await completions
          .createCompletedSessionAndUpdateProgress(
            completion(
              second.id,
              '01',
              new Date(
                '2026-09-12T10:00:00.000Z',
              ),
              4,
              4,
            ),
          );

        const firstProgress =
          await progress
            .findByUserAndConceptId(
              first.id,
              conceptId,
            );

        const secondProgress =
          await progress
            .findByUserAndConceptId(
              second.id,
              conceptId,
            );

        expect(
          firstProgress?.correctAttempts,
        ).toBe(
          1,
        );

        expect(
          secondProgress?.correctAttempts,
        ).toBe(
          4,
        );
      },
    );

    it(
      'rejects a technology mismatch and rolls the completion insert back',
      async () => {
        const user =
          await createUser(
            'mismatch',
          );

        await completions
          .createCompletedSessionAndUpdateProgress(
            completion(
              user.id,
              '01',
              new Date(
                '2026-09-12T10:00:00.000Z',
              ),
              2,
              1,
            ),
          );

        const before =
          await prisma.completedSession.count({
            where: {
              userId:
                user.id,
            },
          });

        const invalid =
          completion(
            user.id,
            '02',
            new Date(
              '2026-09-12T11:00:00.000Z',
            ),
            2,
            2,
          );

        await expect(
          completions
            .createCompletedSessionAndUpdateProgress({
              ...invalid,

              technologyId:
                technologyIdSchema.parse(
                  'react',
                ),
            }),
        ).rejects.toBeInstanceOf(
          ConceptProgressTechnologyMismatchError,
        );

        expect(
          await prisma.completedSession.count({
            where: {
              userId:
                user.id,
            },
          }),
        ).toBe(
          before,
        );
      },
    );

    it(
      'lists only one user progress ordered by most recent practice',
      async () => {
        const user =
          await createUser(
            'list',
          );

        await completions
          .createCompletedSessionAndUpdateProgress(
            completion(
              user.id,
              '01',
              new Date(
                '2026-09-12T13:00:00.000Z',
              ),
              4,
              3,
            ),
          );

        const records =
          await progress
            .findByUserId(
              user.id,
            );

        expect(
          records,
        ).toHaveLength(
          1,
        );

        expect(
          records[0]?.userId,
        ).toBe(
          user.id,
        );
      },
    );
  },
);
