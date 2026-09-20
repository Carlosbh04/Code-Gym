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
    'Arrays levels integration requires NODE_ENV=test and a DB_NAME ending in _test',
  );
}

const prisma =
  createPrismaClient(
    config.database,
  );

const expected = {
  FOUNDATION: {
    sections: 18,
    sessions: 6,
    exercises: 22,
    ids: [
      'js-arrays-iteration-quiz-01',
      'js-arrays-coding-transform-01',
      'js-arrays-filter-mutation-01',
      'js-arrays-map-vs-foreach-01',
      'js-arrays-reduce-accumulator-01',
      'js-arrays-iteration-checkpoint-01',
    ],
  },

  DEEPENING: {
    sections: 18,
    sessions: 6,
    exercises: 25,
    ids: [
      'js-arrays-deepening-quiz-01',
      'js-arrays-deepening-mutation-01',
      'js-arrays-deepening-references-01',
      'js-arrays-deepening-callback-effects-01',
      'js-arrays-deepening-chaining-01',
      'js-arrays-deepening-checkpoint-01',
    ],
  },

  MASTERY: {
    sections: 18,
    sessions: 6,
    exercises: 26,
    ids: [
      'js-arrays-mastery-quiz-01',
      'js-arrays-mastery-object-accumulator-01',
      'js-arrays-mastery-grouping-01',
      'js-arrays-mastery-frequency-01',
      'js-arrays-mastery-integrated-01',
      'js-arrays-mastery-checkpoint-01',
    ],
  },
} as const;

const expectedKinds = [
  'QUIZ',
  'PRACTICE',
  'PRACTICE',
  'PRACTICE',
  'PRACTICE',
  'CHECKPOINT',
] as const;

const expectedPositions = [
  0,
  1,
  2,
  3,
  4,
  5,
] as const;

describe(
  'Arrays imported three-level catalog',
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
                'js-array-iteration',
            },
            include: {
              learningLevels: {
                orderBy: {
                  position:
                    'asc',
                },
              },

              learningSections: {
                orderBy: {
                  position:
                    'asc',
                },
              },

              sessions: {
                orderBy: [
                  {
                    levelId:
                      'asc',
                  },
                  {
                    position:
                      'asc',
                  },
                ],
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

        if (concept === null) {
          throw new Error(
            'Arrays concept was not imported',
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
            expectedKinds,
          );

          expect(
            sessions.map(
              session =>
                session.position,
            ),
          ).toEqual(
            expectedPositions,
          );

          expect(
            sessions.every(
              session =>
                session
                  .requiredForProgression
                ,
            ),
          ).toBe(true);
        }

        expect(
          concept.learningSections,
        ).toHaveLength(
          54,
        );

        expect(
          concept.sessions,
        ).toHaveLength(
          18,
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
          73,
        );
      },
      20_000,
    );
  },
);
