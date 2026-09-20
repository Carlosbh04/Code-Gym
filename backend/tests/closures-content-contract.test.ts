import {
  describe,
  expect,
  it,
} from 'vitest';

import fs from 'node:fs';
import path from 'node:path';

import {
  resolvePrivateVerifierConfig,
} from '../src/content/private-verifier-registry.js';

const ROOT =
  path.resolve(
    process.cwd(),
    '../frontend/src/data/content/javascript/closures',
  );

const INDEX_PATH =
  path.join(
    ROOT,
    'index.json',
  );

const SESSIONS_DIR =
  path.join(
    ROOT,
    'sessions',
  );

type SessionStep = {
  id: string;
  type: string;
  testCases?: unknown[] | null;
};

type Session = {
  id: string;
  title: string;
  difficulty: string;
  conceptId: string;
  technologyId: string;
  version: string;
  status: string;
  steps: SessionStep[];
  position: number;
  kind: string;
  levelId: string;
  requiredForProgression: boolean;
};

function readJson(
  filePath: string,
): unknown {
  return JSON.parse(
    fs.readFileSync(
      filePath,
      'utf8',
    ),
  ) as unknown;
}

function readSessions(): Session[] {
  return fs
    .readdirSync(SESSIONS_DIR)
    .filter(
      file =>
        file.endsWith('.json'),
    )
    .map(
      file =>
        readJson(
          path.join(
            SESSIONS_DIR,
            file,
          ),
        ) as Session,
    );
}

describe(
  'Closures content contract',
  () => {
    it(
      'declares foundation, deepening and mastery in canonical order',
      () => {
        const index =
          readJson(
            INDEX_PATH,
          ) as {
            levels: {
              id: string;
              position: number;
            }[];
          };

        expect(
          index.levels.map(
            level => level.id,
          ),
        ).toEqual([
          'foundation',
          'deepening',
          'mastery',
        ]);

        expect(
          index.levels.map(
            level => level.position,
          ),
        ).toEqual([
          0,
          1,
          2,
        ]);
      },
    );

    it(
      'contains level-aware theory for deepening and mastery',
      () => {
        const index =
          readJson(
            INDEX_PATH,
          ) as {
            content: {
              sections: {
                levelId?: string;
              }[];
            };
          };

        const deepening =
          index.content.sections.filter(
            section =>
              section.levelId ===
              'deepening',
          );

        const mastery =
          index.content.sections.filter(
            section =>
              section.levelId ===
              'mastery',
          );

        expect(deepening).toHaveLength(11);
        expect(mastery).toHaveLength(11);
      },
    );

    it(
      'has five required sessions in each new level',
      () => {
        const sessions =
          readSessions();

        for (
          const levelId of [
            'deepening',
            'mastery',
          ]
        ) {
          const levelSessions =
            sessions
              .filter(
                session =>
                  session.levelId ===
                  levelId,
              )
              .sort(
                (a, b) =>
                  a.position -
                  b.position,
              );

          expect(
            levelSessions,
          ).toHaveLength(5);

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
              session
                .requiredForProgression,
            ),
          ).toBe(true);
        }
      },
    );

    it(
      'has the expected exercise distribution in each new level',
      () => {
        const sessions =
          readSessions();

        for (
          const levelId of [
            'deepening',
            'mastery',
          ]
        ) {
          const counts =
            new Map<
              string,
              number
            >();

          const levelSessions =
            sessions.filter(
              session =>
                session.levelId ===
                levelId,
            );

          let totalSteps = 0;

          for (
            const session
            of levelSessions
          ) {
            for (
              const step
              of session.steps
            ) {
              totalSteps += 1;

              counts.set(
                step.type,
                (
                  counts.get(
                    step.type,
                  )
                  ?? 0
                ) + 1,
              );
            }
          }

          expect(totalSteps).toBe(21);

          expect(
            Object.fromEntries(
              counts,
            ),
          ).toEqual({
            'code-reading': 6,
            'predict-output': 7,
            'find-error': 4,
            'fix-code': 4,
          });
        }
      },
    );

    it(
      'gives every new fix-code public and private verification',
      () => {
        const sessions =
          readSessions();

        const fixCodes =
          sessions
            .filter(
              session =>
                (
                  session.levelId ===
                    'deepening'
                  ||
                  session.levelId ===
                    'mastery'
                ),
            )
            .flatMap(
              session =>
                session.steps
                  .filter(
                    step =>
                      step.type ===
                      'fix-code',
                  )
                  .map(
                    step => ({
                      session,
                      step,
                    }),
                  ),
            );

        expect(fixCodes).toHaveLength(8);

        for (
          const {
            session,
            step,
          }
          of fixCodes
        ) {
          expect(
            step.testCases,
          ).toHaveLength(3);

          const privateConfig =
            resolvePrivateVerifierConfig(
              session.id,
              step.id,
            );

          expect(
            privateConfig
              .hiddenTestCases,
          ).toHaveLength(2);

          expect(
            privateConfig
              .pedagogicalRequirements,
          ).toEqual([]);

          expect(
            privateConfig.oracle,
          ).toBeNull();
        }
      },
    );

    it(
      'keeps public content free of private verifier data',
      () => {
        const sessions =
          readSessions();

        for (
          const session
          of sessions
        ) {
          const serialized =
            JSON.stringify(
              session,
            );

          expect(
            serialized,
          ).not.toContain(
            'hiddenTestCases',
          );

          expect(
            serialized,
          ).not.toContain(
            'pedagogicalRequirements',
          );

          expect(
            serialized,
          ).not.toContain(
            '"oracle"',
          );
        }
      },
    );

    it(
      'keeps canonical ids and publication metadata',
      () => {
        const sessions =
          readSessions();

        for (
          const session
          of sessions
        ) {
          expect(
            session.conceptId,
          ).toBe(
            'js-closure-basics',
          );

          expect(
            session.technologyId,
          ).toBe(
            'javascript',
          );

          expect(
            session.status,
          ).toBe(
            'published',
          );

          expect(
            session.version,
          ).toMatch(
            /^\d+\.\d+\.\d+$/,
          );

          if (
            session.levelId ===
              'deepening'
            ||
            session.levelId ===
              'mastery'
          ) {
            expect(
              session.version,
            ).toBe(
              '1.0.0',
            );
          }
        }
      },
    );
  },
);
