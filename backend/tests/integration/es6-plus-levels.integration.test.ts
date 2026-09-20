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
  createPrismaClient,
} from '../../src/database/prisma.js';

const config =
  loadConfig();

if (
  !config.isTest
  || !config.database.name.endsWith(
    '_test',
  )
  || config.database.name === 'codegym'
) {
  throw new Error(
    'ES6+ levels integration requires NODE_ENV=test and a DB_NAME ending in _test',
  );
}

const prisma =
  createPrismaClient(
    config.database,
  );

const expected = {
  FOUNDATION: {
    sections:
      5,
    sessions:
      6,
    exercises:
      18,
    ids: [
      'js-es6-foundation-quiz-01',
      'js-es6-coding-unique-tags-01',
      'js-es6-destructuring-shapes-01',
      'js-es6-nullish-defaults-01',
      'js-es6-rest-arguments-01',
      'js-es6-foundation-checkpoint-01',
    ],
    kinds: [
      'QUIZ',
      'PRACTICE',
      'PRACTICE',
      'PRACTICE',
      'PRACTICE',
      'CHECKPOINT',
    ],
    positions: [
      0,
      1,
      2,
      3,
      4,
      5,
    ],
  },

  DEEPENING: {
    sections:
      11,
    sessions:
      5,
    exercises:
      21,
    ids: [
      'js-es6-deepening-quiz-01',
      'js-es6-deepening-nested-destructuring-01',
      'js-es6-deepening-object-rest-01',
      'js-es6-deepening-safe-access-01',
      'js-es6-deepening-checkpoint-01',
    ],
    kinds: [
      'QUIZ',
      'PRACTICE',
      'PRACTICE',
      'PRACTICE',
      'CHECKPOINT',
    ],
    positions: [
      0,
      1,
      2,
      3,
      4,
    ],
  },

  MASTERY: {
    sections:
      11,
    sessions:
      5,
    exercises:
      21,
    ids: [
      'js-es6-mastery-quiz-01',
      'js-es6-mastery-immutable-update-01',
      'js-es6-mastery-normalize-profile-01',
      'js-es6-mastery-config-composition-01',
      'js-es6-mastery-checkpoint-01',
    ],
    kinds: [
      'QUIZ',
      'PRACTICE',
      'PRACTICE',
      'PRACTICE',
      'CHECKPOINT',
    ],
    positions: [
      0,
      1,
      2,
      3,
      4,
    ],
  },
} as const;

describe(
  'ES6+ imported three-level catalog',
  () => {
    beforeAll(
      async () => {
        await prisma.$connect();
      },
      20_000,
    );

    afterAll(
      async () => {
        await prisma.$disconnect();
      },
    );

    it(
      'persists theory and ordered required sessions for all three levels',
      async () => {
        const concept =
          await prisma.concept.findUnique({
            where: {
              id:
                'js-es6-modern-syntax',
            },

            include: {
              learningLevels: {
                orderBy: {
                  position:
                    'asc',
                },
              },

              learningSections:
                true,

              sessions: {
                orderBy: {
                  position:
                    'asc',
                },

                include: {
                  steps:
                    true,
                },
              },
            },
          });

        expect(
          concept,
        ).not.toBeNull();

        if (
          concept === null
        ) {
          throw new Error(
            'ES6+ concept was not imported',
          );
        }

        expect(
          concept.learningLevels.map(
            level => [
              level.levelId,
              level.position,
            ],
          ),
        ).toEqual([
          [
            'FOUNDATION',
            0,
          ],
          [
            'DEEPENING',
            1,
          ],
          [
            'MASTERY',
            2,
          ],
        ]);

        for (
          const levelId
          of [
            'FOUNDATION',
            'DEEPENING',
            'MASTERY',
          ] as const
        ) {
          const sessions =
            concept.sessions
              .filter(
                session =>
                  session.levelId
                  === levelId,
              )
              .sort(
                (
                  left,
                  right,
                ) =>
                  left.position
                  - right.position,
              );

          const sections =
            concept.learningSections
              .filter(
                section =>
                  section.levelId
                  === levelId,
              );

          expect(
            sections,
          ).toHaveLength(
            expected[
              levelId
            ].sections,
          );

          expect(
            sessions,
          ).toHaveLength(
            expected[
              levelId
            ].sessions,
          );

          expect(
            sessions.reduce(
              (
                total,
                session,
              ) =>
                total
                + session.steps.length,
              0,
            ),
          ).toBe(
            expected[
              levelId
            ].exercises,
          );

          expect(
            sessions.map(
              session =>
                session.id,
            ),
          ).toEqual(
            expected[
              levelId
            ].ids,
          );

          expect(
            sessions.map(
              session =>
                session.kind,
            ),
          ).toEqual(
            expected[
              levelId
            ].kinds,
          );

          expect(
            sessions.map(
              session =>
                session.position,
            ),
          ).toEqual(
            expected[
              levelId
            ].positions,
          );

          expect(
            sessions.every(
              session =>
                session
                  .requiredForProgression,
            ),
          ).toBe(true);
        }

        expect(
          concept.learningSections,
        ).toHaveLength(
          27,
        );

        expect(
          concept.sessions,
        ).toHaveLength(
          16,
        );

        expect(
          concept.sessions.reduce(
            (
              total,
              session,
            ) =>
              total
              + session.steps.length,
            0,
          ),
        ).toBe(
          60,
        );
      },
      20_000,
    );
  },
);
