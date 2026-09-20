import {
  readFile,
  readdir,
} from 'node:fs/promises';

import {
  join,
} from 'node:path';

import {
  describe,
  expect,
  it,
} from 'vitest';

import {
  resolvePrivateVerifierConfig,
} from '../src/content/private-verifier-registry.js';

type LevelId =
  | 'foundation'
  | 'deepening'
  | 'mastery';

type StepType =
  | 'code-reading'
  | 'predict-output'
  | 'find-error'
  | 'fix-code';

interface IndexFile {
  readonly levels:
    readonly {
      readonly id:
        LevelId;
      readonly position:
        number;
    }[];

  readonly content: {
    readonly sections:
      readonly {
        readonly levelId:
          LevelId;
      }[];
  };
}

interface Step {
  readonly id:
    string;
  readonly type:
    StepType;
  readonly testCases?:
    readonly unknown[];
}

interface Session {
  readonly id:
    string;
  readonly levelId:
    LevelId;
  readonly position:
    number;
  readonly kind:
    'quiz'
    | 'practice'
    | 'checkpoint';
  readonly requiredForProgression:
    boolean;
  readonly status:
    string;
  readonly steps:
    readonly Step[];
}

const root =
  join(
    process.cwd(),
    '..',
    'frontend',
    'src',
    'data',
    'content',
    'javascript',
    'es6-plus',
  );

async function readJson<T>(
  filePath: string,
): Promise<T> {
  return JSON.parse(
    await readFile(
      filePath,
      'utf8',
    ),
  ) as T;
}

async function loadSessions():
Promise<readonly Session[]> {
  const directory =
    join(
      root,
      'sessions',
    );

  const files =
    (
      await readdir(
        directory,
      )
    )
      .filter(
        file =>
          file.endsWith(
            '.json',
          ),
      )
      .sort();

  return Promise.all(
    files.map(
      file =>
        readJson<Session>(
          join(
            directory,
            file,
          ),
        ),
    ),
  );
}

describe(
  'ES6+ three-level content contract',
  () => {
    it(
      'declares Foundation -> Deepening -> Mastery',
      async () => {
        const index =
          await readJson<IndexFile>(
            join(
              root,
              'index.json',
            ),
          );

        expect(
          index.levels.map(
            level => [
              level.id,
              level.position,
            ],
          ),
        ).toEqual([
          [
            'foundation',
            0,
          ],
          [
            'deepening',
            1,
          ],
          [
            'mastery',
            2,
          ],
        ]);
      },
    );

    it(
      'assigns all 27 theory sections explicitly to a level',
      async () => {
        const index =
          await readJson<IndexFile>(
            join(
              root,
              'index.json',
            ),
          );

        const counts:
        Record<
          LevelId,
          number
        > = {
          foundation:
            0,
          deepening:
            0,
          mastery:
            0,
        };

        for (
          const section
          of index.content.sections
        ) {
          counts[
            section.levelId
          ] += 1;
        }

        expect(
          counts,
        ).toEqual({
          foundation:
            5,
          deepening:
            11,
          mastery:
            11,
        });

        expect(
          index.content.sections,
        ).toHaveLength(
          27,
        );
      },
    );

    it(
      'keeps the canonical session counts and ordering per level',
      async () => {
        const sessions =
          await loadSessions();

        expect(
          sessions,
        ).toHaveLength(
          16,
        );

        const expected = {
          foundation: {
            positions:
              [
                0,
                1,
                2,
                3,
                4,
                5,
              ],
            kinds:
              [
                'quiz',
                'practice',
                'practice',
                'practice',
                'practice',
                'checkpoint',
              ],
          },

          deepening: {
            positions:
              [
                0,
                1,
                2,
                3,
                4,
              ],
            kinds:
              [
                'quiz',
                'practice',
                'practice',
                'practice',
                'checkpoint',
              ],
          },

          mastery: {
            positions:
              [
                0,
                1,
                2,
                3,
                4,
              ],
            kinds:
              [
                'quiz',
                'practice',
                'practice',
                'practice',
                'checkpoint',
              ],
          },
        } as const;

        for (
          const levelId
          of [
            'foundation',
            'deepening',
            'mastery',
          ] as const
        ) {
          const levelSessions =
            sessions
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

          expect(
            levelSessions.map(
              session =>
                session.position,
            ),
          ).toEqual(
            expected[
              levelId
            ].positions,
          );

          expect(
            levelSessions.map(
              session =>
                session.kind,
            ),
          ).toEqual(
            expected[
              levelId
            ].kinds,
          );

          expect(
            levelSessions.every(
              session =>
                session
                  .requiredForProgression,
            ),
          ).toBe(true);

          expect(
            levelSessions.every(
              session =>
                session.status
                === 'published',
            ),
          ).toBe(true);
        }
      },
    );

    it(
      'keeps the expected 60-step distribution',
      async () => {
        const sessions =
          await loadSessions();

        const counts:
        Record<
          StepType,
          number
        > = {
          'code-reading':
            0,
          'predict-output':
            0,
          'find-error':
            0,
          'fix-code':
            0,
        };

        let total =
          0;

        for (
          const session
          of sessions
        ) {
          for (
            const step
            of session.steps
          ) {
            total += 1;

            counts[
              step.type
            ] += 1;
          }
        }

        expect(
          total,
        ).toBe(
          60,
        );

        expect(
          counts,
        ).toEqual({
          'code-reading':
            17,
          'predict-output':
            20,
          'find-error':
            11,
          'fix-code':
            12,
        });
      },
    );

    it(
      'keeps all twelve coding exercises public and behavior-testable',
      async () => {
        const sessions =
          await loadSessions();

        const coding =
          sessions.flatMap(
            session =>
              session.steps
                .filter(
                  step =>
                    step.type
                    === 'fix-code',
                )
                .map(
                  step => ({
                    sessionId:
                      session.id,
                    exerciseId:
                      step.id,
                    publicCases:
                      step.testCases
                        ?.length
                      ?? 0,
                  }),
                ),
          );

        expect(
          coding,
        ).toHaveLength(
          12,
        );

        expect(
          coding.reduce(
            (
              total,
              exercise,
            ) =>
              total
              + exercise.publicCases,
            0,
          ),
        ).toBe(
          33,
        );
      },
    );

    it(
      'keeps private verifier coverage for all twelve fix-code exercises',
      async () => {
        const sessions =
          await loadSessions();

        const coding =
          sessions.flatMap(
            session =>
              session.steps
                .filter(
                  step =>
                    step.type
                    === 'fix-code',
                )
                .map(
                  step => [
                    session.id,
                    step.id,
                  ] as const,
                ),
          );

        for (
          const [
            sessionId,
            exerciseId,
          ]
          of coding
        ) {
          const config =
            resolvePrivateVerifierConfig(
              sessionId,
              exerciseId,
            );

          expect(
            config.hiddenTestCases.length,
            `${sessionId}/${exerciseId}`,
          ).toBeGreaterThanOrEqual(
            2,
          );

          expect(
            config.pedagogicalRequirements,
          ).toEqual([]);

          expect(
            config.oracle,
          ).toBeNull();
        }
      },
    );

    it(
      'gives exactly two hidden behavioral cases to each of the eight new exercises',
      () => {
        const targets = [
          [
            'js-es6-deepening-nested-destructuring-01',
            'step-4',
          ],
          [
            'js-es6-deepening-object-rest-01',
            'step-4',
          ],
          [
            'js-es6-deepening-safe-access-01',
            'step-4',
          ],
          [
            'js-es6-deepening-checkpoint-01',
            'step-4',
          ],
          [
            'js-es6-mastery-immutable-update-01',
            'step-4',
          ],
          [
            'js-es6-mastery-normalize-profile-01',
            'step-4',
          ],
          [
            'js-es6-mastery-config-composition-01',
            'step-4',
          ],
          [
            'js-es6-mastery-checkpoint-01',
            'step-4',
          ],
        ] as const;

        for (
          const [
            sessionId,
            exerciseId,
          ]
          of targets
        ) {
          const config =
            resolvePrivateVerifierConfig(
              sessionId,
              exerciseId,
            );

          expect(
            config.hiddenTestCases,
          ).toHaveLength(
            2,
          );

          expect(
            config.pedagogicalRequirements,
          ).toEqual([]);

          expect(
            config.oracle,
          ).toBeNull();
        }
      },
    );
  },
);
