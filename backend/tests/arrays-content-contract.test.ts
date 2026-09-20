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

type LearningLevelId =
  | 'foundation'
  | 'deepening'
  | 'mastery';

type StepType =
  | 'code-reading'
  | 'predict-output'
  | 'find-error'
  | 'fix-code';

interface ContentIndex {
  readonly levels:
    readonly {
      readonly id:
        LearningLevelId;
      readonly position:
        number;
    }[];

  readonly content: {
    readonly sections:
      readonly {
        readonly id:
          string;
        readonly levelId:
          LearningLevelId;
      }[];
  };
}

interface SessionStep {
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
    LearningLevelId;
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
    readonly SessionStep[];
}

const arraysRoot =
  join(
    process.cwd(),
    '..',
    'frontend',
    'src',
    'data',
    'content',
    'javascript',
    'arrays',
  );

const sessionsRoot =
  join(
    arraysRoot,
    'sessions',
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
  const files =
    (
      await readdir(
        sessionsRoot,
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
            sessionsRoot,
            file,
          ),
        ),
    ),
  );
}

describe(
  'Arrays three-level content contract',
  () => {
    it(
      'declares Foundation -> Deepening -> Mastery in canonical order',
      async () => {
        const index =
          await readJson<ContentIndex>(
            join(
              arraysRoot,
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
      'assigns all 54 theory sections explicitly to their learning level',
      async () => {
        const index =
          await readJson<ContentIndex>(
            join(
              arraysRoot,
              'index.json',
            ),
          );

        const counts =
          new Map<
            LearningLevelId,
            number
          >([
            [
              'foundation',
              0,
            ],
            [
              'deepening',
              0,
            ],
            [
              'mastery',
              0,
            ],
          ]);

        for (
          const section
          of index.content.sections
        ) {
          expect(
            section.levelId,
          ).toBeDefined();

          counts.set(
            section.levelId,
            (
              counts.get(
                section.levelId,
              )
              ?? 0
            )
            + 1,
          );
        }

        expect(
          index.content.sections,
        ).toHaveLength(
          54,
        );

        expect(
          Object.fromEntries(
            counts,
          ),
        ).toEqual({
          foundation: 18,
          deepening: 18,
          mastery: 18,
        });
      },
    );

    it(
      'keeps six ordered required sessions per level: quiz, four practices and checkpoint',
      async () => {
        const sessions =
          await loadSessions();

        expect(
          sessions,
        ).toHaveLength(
          18,
        );

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
                  first,
                  second,
                ) =>
                  first.position
                  - second.position,
              );

          expect(
            levelSessions,
          ).toHaveLength(
            6,
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
            5,
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
            'practice',
            'checkpoint',
          ]);

          expect(
            levelSessions.every(
              session =>
                session
                  .requiredForProgression
                ,
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
      'preserves the expected 73-step exercise distribution',
      async () => {
        const sessions =
          await loadSessions();

        const counts:
        Record<
          StepType,
          number
        > = {
          'code-reading': 0,
          'predict-output': 0,
          'find-error': 0,
          'fix-code': 0,
        };

        let totalSteps =
          0;

        for (
          const session
          of sessions
        ) {
          for (
            const step
            of session.steps
          ) {
            totalSteps += 1;
            counts[
              step.type
            ] += 1;
          }
        }

        expect(
          totalSteps,
        ).toBe(
          73,
        );

        expect(
          counts,
        ).toEqual({
          'code-reading': 30,
          'predict-output': 27,
          'find-error': 12,
          'fix-code': 4,
        });
      },
    );

    it(
      'keeps the four coding exercises behavior-testable with three public cases each',
      async () => {
        const sessions =
          await loadSessions();

        const fixCode =
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
          fixCode,
        ).toEqual([
          {
            sessionId:
              'js-arrays-coding-transform-01',
            exerciseId:
              'step-1',
            publicCases:
              3,
          },
          {
            sessionId:
              'js-arrays-filter-mutation-01',
            exerciseId:
              'step-4',
            publicCases:
              3,
          },
          {
            sessionId:
              'js-arrays-map-vs-foreach-01',
            exerciseId:
              'step-4',
            publicCases:
              3,
          },
          {
            sessionId:
              'js-arrays-reduce-accumulator-01',
            exerciseId:
              'step-4',
            publicCases:
              3,
          },
        ]);
      },
    );

    it(
      'has unique session ids and unique exercise ids inside every session',
      async () => {
        const sessions =
          await loadSessions();

        const sessionIds =
          sessions.map(
            session =>
              session.id,
          );

        expect(
          new Set(
            sessionIds,
          ).size,
        ).toBe(
          sessionIds.length,
        );

        for (
          const session
          of sessions
        ) {
          const stepIds =
            session.steps.map(
              step =>
                step.id,
            );

          expect(
            new Set(
              stepIds,
            ).size,
          ).toBe(
            stepIds.length,
          );
        }
      },
    );
  },
);
