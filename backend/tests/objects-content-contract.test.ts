import fs from 'node:fs';
import path from 'node:path';

import {
  describe,
  expect,
  it,
} from 'vitest';

type Step = {
  id: string;
  type: string;
  testCases: unknown[] | null;
};

type Session = {
  id: string;
  conceptId: string;
  technologyId: string;
  version: string;
  status: string;
  levelId: string;
  position: number;
  kind: string;
  passingPercentage: number | null;
  requiredForProgression: boolean;
  steps: Step[];
};

const ROOT =
  path.resolve(
    process.cwd(),
    '..',
  );

const OBJECTS_DIR =
  path.join(
    ROOT,
    'frontend',
    'src',
    'data',
    'content',
    'javascript',
    'objects',
  );

const SESSIONS_DIR =
  path.join(
    OBJECTS_DIR,
    'sessions',
  );

const REGISTRY_PATH =
  path.join(
    ROOT,
    'backend',
    'src',
    'content',
    'private-verifier-registry.ts',
  );

const readJson =
  (
    filePath: string,
  ): unknown =>
    JSON.parse(
      fs.readFileSync(
        filePath,
        'utf8',
      ),
    );

const index =
  readJson(
    path.join(
      OBJECTS_DIR,
      'index.json',
    ),
  ) as {
    levels: {
      id: string;
      position: number;
    }[];
    content: {
      sections: unknown[];
    };
  };

const sessions =
  fs.readdirSync(
    SESSIONS_DIR,
  )
    .filter(
      fileName =>
        fileName.endsWith('.json'),
    )
    .map(
      fileName =>
        readJson(
          path.join(
            SESSIONS_DIR,
            fileName,
          ),
        ) as Session,
    );

const newSessionIds = [
  'js-objects-deepening-quiz-01',
  'js-objects-deepening-nested-copy-01',
  'js-objects-deepening-entry-transform-01',
  'js-objects-deepening-merge-precedence-01',
  'js-objects-deepening-checkpoint-01',
  'js-objects-mastery-quiz-01',
  'js-objects-mastery-aliasing-01',
  'js-objects-mastery-normalize-01',
  'js-objects-mastery-nested-config-01',
  'js-objects-mastery-checkpoint-01',
] as const;

const newFixCodeIds = [
  'js-objects-deepening-nested-copy-01',
  'js-objects-deepening-entry-transform-01',
  'js-objects-deepening-merge-precedence-01',
  'js-objects-deepening-checkpoint-01',
  'js-objects-mastery-aliasing-01',
  'js-objects-mastery-normalize-01',
  'js-objects-mastery-nested-config-01',
  'js-objects-mastery-checkpoint-01',
] as const;

describe(
  'Objects three-level content contract',
  () => {
    it(
      'keeps the canonical level order',
      () => {
        expect(
          index.levels.map(
            level => [
              level.id,
              level.position,
            ],
          ),
        ).toEqual([
          ['foundation', 0],
          ['deepening', 1],
          ['mastery', 2],
        ]);
      },
    );

    it(
      'contains 27 theory sections',
      () => {
        expect(
          index.content.sections,
        ).toHaveLength(
          27,
        );
      },
    );

    it.each(
      [
        ['deepening', 21],
        ['mastery', 21],
      ] as const,
    )(
      '%s exposes five required sessions and 21 exercises',
      (
        levelId,
        exerciseCount,
      ) => {
        const levelSessions =
          sessions
            .filter(
              session =>
                session.levelId
                === levelId,
            )
            .sort(
              (a, b) =>
                a.position
                - b.position,
            );

        expect(
          levelSessions,
        ).toHaveLength(
          5,
        );

        expect(
          levelSessions.map(
            session =>
              session.position,
          ),
        ).toEqual([
          0,
          1,
          2,
          3,
          4,
        ]);

        expect(
          levelSessions.map(
            session =>
              session.kind,
          ),
        ).toEqual([
          'quiz',
          'practice',
          'practice',
          'practice',
          'checkpoint',
        ]);

        expect(
          levelSessions.every(
            session =>
              session.requiredForProgression,
          ),
        ).toBe(
          true,
        );

        expect(
          levelSessions
            .flatMap(
              session =>
                session.steps,
            ),
        ).toHaveLength(
          exerciseCount,
        );

        const typeCounts =
          levelSessions
            .flatMap(
              session =>
                session.steps,
            )
            .reduce<Record<string, number>>(
              (
                acc,
                step,
              ) => {
                acc[step.type] =
                  (acc[step.type] ?? 0)
                  + 1;

                return acc;
              },
              {},
            );

        expect(
          typeCounts,
        ).toEqual({
          'code-reading': 6,
          'predict-output': 7,
          'find-error': 4,
          'fix-code': 4,
        });
      },
    );

    it(
      'keeps three public cases on every new fix-code',
      () => {
        for (
          const sessionId
          of newFixCodeIds
        ) {
          const session =
            sessions.find(
              item =>
                item.id === sessionId,
            );

          expect(
            session,
            sessionId,
          ).toBeDefined();

          const fixCode =
            session?.steps.find(
              step =>
                step.type
                === 'fix-code',
            );

          expect(
            fixCode,
            sessionId,
          ).toBeDefined();

          expect(
            fixCode?.testCases,
            sessionId,
          ).toHaveLength(
            3,
          );
        }
      },
    );

    it(
      'publishes canonical metadata for every new session',
      () => {
        for (
          const sessionId
          of newSessionIds
        ) {
          const session =
            sessions.find(
              item =>
                item.id === sessionId,
            );

          expect(
            session,
            sessionId,
          ).toBeDefined();

          expect(
            session?.conceptId,
          ).toBe(
            'js-object-references',
          );

          expect(
            session?.technologyId,
          ).toBe(
            'javascript',
          );

          expect(
            session?.version,
          ).toBe(
            '1.0.0',
          );

          expect(
            session?.status,
          ).toBe(
            'published',
          );

          if (
            session?.kind === 'quiz'
          ) {
            expect(
              session.passingPercentage,
            ).toBe(
              70,
            );
          } else {
            expect(
              session?.passingPercentage,
            ).toBeNull();
          }
        }
      },
    );

    it(
      'keeps private verifier data out of public sessions',
      () => {
        const rawSessions =
          fs.readdirSync(
            SESSIONS_DIR,
          )
            .filter(
              fileName =>
                fileName.endsWith(
                  '.json',
                ),
            )
            .map(
              fileName =>
                fs.readFileSync(
                  path.join(
                    SESSIONS_DIR,
                    fileName,
                  ),
                  'utf8',
                ),
            )
            .join(
              '\n',
            );

        expect(
          rawSessions,
        ).not.toContain(
          'hiddenTestCases',
        );

        expect(
          rawSessions,
        ).not.toContain(
          'pedagogicalRequirements',
        );

        expect(
          rawSessions,
        ).not.toContain(
          '"oracle"',
        );
      },
    );

    it(
      'registers two hidden cases and no pedagogical rule for every new fix-code',
      () => {
        const registry =
          fs.readFileSync(
            REGISTRY_PATH,
            'utf8',
          );

        for (
          const sessionId
          of newFixCodeIds
        ) {
          const marker =
            `'${sessionId}'`;

          const start =
            registry.indexOf(
              marker,
            );

          expect(
            start,
            sessionId,
          ).toBeGreaterThanOrEqual(
            0,
          );

          const next =
            registry.indexOf(
              '\n    [',
              start
              + marker.length,
            );

          const block =
            registry.slice(
              start,
              next === -1
                ? registry.length
                : next,
            );

          expect(
            (
              block.match(
                /description:/g,
              )
              ?? []
            ),
            sessionId,
          ).toHaveLength(
            2,
          );

          expect(
            block,
            sessionId,
          ).toContain(
            'pedagogicalRequirements:',
          );

          expect(
            block,
            sessionId,
          ).toContain(
            'Object.freeze([])',
          );

          expect(
            block,
            sessionId,
          ).toContain(
            'oracle:',
          );

          expect(
            block,
            sessionId,
          ).toContain(
            'null',
          );
        }
      },
    );
  },
);
