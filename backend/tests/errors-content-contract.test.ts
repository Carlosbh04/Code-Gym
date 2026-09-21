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

interface ErrorsIndex {
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

interface ErrorStep {
  readonly id:
    string;

  readonly type:
    StepType;

  readonly stepOrder:
    number;

  readonly testCases?:
    readonly unknown[];
}

interface ErrorSession {
  readonly id:
    string;

  readonly conceptId:
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
    readonly ErrorStep[];
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
    'errors',
  );

async function readJson<T>(
  file: string,
): Promise<T> {
  return JSON.parse(
    await readFile(
      file,
      'utf8',
    ),
  ) as T;
}

async function loadSessions():
Promise<readonly ErrorSession[]> {
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
        readJson<ErrorSession>(
          join(
            directory,
            file,
          ),
        ),
    ),
  );
}

describe(
  'Errors three-level content contract',
  () => {
    it(
      'declares Foundation -> Deepening -> Mastery',
      async () => {
        const index =
          await readJson<ErrorsIndex>(
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
          await readJson<ErrorsIndex>(
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
          index.content.sections,
        ).toHaveLength(
          27,
        );

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
      },
    );

    it(
      'keeps the canonical session counts and ordering',
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

          expect(
            levelSessions.every(
              session =>
                session.conceptId
                === 'js-error-handling',
            ),
          ).toBe(true);
        }
      },
    );

    it(
      'keeps all 60 steps sequentially ordered',
      async () => {
        const sessions =
          await loadSessions();

        let total =
          0;

        for (
          const session
          of sessions
        ) {
          session.steps.forEach(
            (
              step,
              index,
            ) => {
              expect(
                step.stepOrder,
                `${session.id}/${step.id}`,
              ).toBe(
                index + 1,
              );

              total += 1;
            },
          );
        }

        expect(
          total,
        ).toBe(
          60,
        );
      },
    );

    it(
      'keeps the expected exercise distribution',
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

        for (
          const session
          of sessions
        ) {
          for (
            const step
            of session.steps
          ) {
            counts[
              step.type
            ] += 1;
          }
        }

        expect(
          counts,
        ).toEqual({
          'code-reading':
            18,
          'predict-output':
            19,
          'find-error':
            11,
          'fix-code':
            12,
        });
      },
    );

    it(
      'keeps twelve coding exercises with 32 public cases',
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
          32,
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
      'gives exactly two hidden behavioral cases to each new coding exercise',
      () => {
        const targets = [
          [
            'js-errors-deepening-error-types-01',
            'step-4',
          ],
          [
            'js-errors-deepening-cause-context-01',
            'step-4',
          ],
          [
            'js-errors-deepening-error-codes-01',
            'step-4',
          ],
          [
            'js-errors-deepening-checkpoint-01',
            'step-4',
          ],
          [
            'js-errors-mastery-domain-error-01',
            'step-4',
          ],
          [
            'js-errors-mastery-translate-error-01',
            'step-4',
          ],
          [
            'js-errors-mastery-recovery-policy-01',
            'step-4',
          ],
          [
            'js-errors-mastery-checkpoint-01',
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
