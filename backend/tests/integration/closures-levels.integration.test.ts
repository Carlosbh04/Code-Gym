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
    'Closures levels integration requires NODE_ENV=test and a DB_NAME ending in _test',
  );
}

const prisma =
  createPrismaClient(
    config.database,
  );

describe(
  'Closures imported three-level catalog',
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
                'js-closure-basics',
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
                  steps: true,
                },
              },
            },
          });

        expect(
          concept,
        ).not.toBeNull();

        if (concept === null) {
          throw new Error(
            'Closures concept was not imported',
          );
        }

        expect(
          concept.learningLevels.map(
            (level) => [
              level.levelId,
              level.position,
            ],
          ),
        ).toEqual([
          ['FOUNDATION', 0],
          ['DEEPENING', 1],
          ['MASTERY', 2],
        ]);

        const expected = {
          FOUNDATION: {
            sections: 5,
            sessions: 6,
            exercises: 18,
          },
          DEEPENING: {
            sections: 11,
            sessions: 5,
            exercises: 21,
          },
          MASTERY: {
            sections: 11,
            sessions: 5,
            exercises: 21,
          },
        } as const;

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
                (session) =>
                  session.levelId
                  === levelId,
              )
              .sort(
                (left, right) =>
                  left.position
                  - right.position,
              );

          expect(
            concept.learningSections.filter(
              (section) =>
                section.levelId
                === levelId,
            ),
          ).toHaveLength(
            expected[levelId].sections,
          );

          expect(
            sessions,
          ).toHaveLength(
            expected[levelId].sessions,
          );

          expect(
            sessions.reduce(
              (total, session) =>
                total
                + session.steps.length,
              0,
            ),
          ).toBe(
            expected[levelId].exercises,
          );

          expect(
            sessions.every(
              (session) =>
                session.requiredForProgression,
            ),
          ).toBe(true);
        }

        for (
          const levelId
          of [
            'DEEPENING',
            'MASTERY',
          ] as const
        ) {
          const sessions =
            concept.sessions
              .filter(
                (session) =>
                  session.levelId
                  === levelId,
              )
              .sort(
                (left, right) =>
                  left.position
                  - right.position,
              );

          expect(
            sessions.map(
              (session) =>
                session.kind,
            ),
          ).toEqual([
            'QUIZ',
            'PRACTICE',
            'PRACTICE',
            'PRACTICE',
            'CHECKPOINT',
          ]);

          expect(
            sessions.map(
              (session) =>
                session.position,
            ),
          ).toEqual([
            0,
            1,
            2,
            3,
            4,
          ]);
        }
      },
      20_000,
    );
  },
);
