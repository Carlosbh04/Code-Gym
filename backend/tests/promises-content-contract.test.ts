import {
  readFile,
  readdir,
} from 'node:fs/promises';

import {
  resolve,
} from 'node:path';

import {
  describe,
  expect,
  it,
} from 'vitest';

interface Section {
  readonly levelId?: string;
}

interface Step {
  readonly id: string;
  readonly type: string;
  readonly stepOrder: number;

  readonly testCases?: readonly {
    readonly call?: string;
    readonly expected?: unknown;
  }[];
}

interface Session {
  readonly id: string;
  readonly conceptId: string;
  readonly levelId: string;
  readonly position: number;
  readonly kind: string;
  readonly requiredForProgression: boolean;
  readonly status: string;
  readonly steps: readonly Step[];
}

interface Concept {
  readonly id: string;
  readonly topicId: string;
  readonly technologyId: string;

  readonly levels:
    readonly {
      readonly id: string;
      readonly position: number;
    }[];

  readonly content: {
    readonly sections:
      readonly Section[];
  };
}

const contentRoot =
  resolve(
    process.cwd(),
    '../frontend/src/data/content/javascript/promises',
  );

const registryPath =
  resolve(
    process.cwd(),
    'src/content/private-verifier-registry.ts',
  );

async function loadJson<T>(
  file: string,
): Promise<T> {
  return JSON.parse(
    await readFile(file, 'utf8'),
  ) as T;
}

async function loadSessions():
Promise<readonly Session[]> {
  const directory =
    resolve(contentRoot, 'sessions');

  const files =
    (await readdir(directory))
      .filter(
        (name) =>
          name.endsWith('.json'),
      )
      .sort();

  return Promise.all(
    files.map(
      (file) =>
        loadJson<Session>(
          resolve(directory, file),
        ),
    ),
  );
}

describe(
  'JavaScript Promises content contract',
  () => {
    it(
      'locks canonical levels and theory',
      async () => {
        const concept =
          await loadJson<Concept>(
            resolve(
              contentRoot,
              'index.json',
            ),
          );

        expect(concept.id)
          .toBe('js-promise-flow');

        expect(concept.topicId)
          .toBe('js-promises');

        expect(concept.technologyId)
          .toBe('javascript');

        expect(concept.levels)
          .toEqual([
            expect.objectContaining({
              id: 'foundation',
              position: 0,
            }),
            expect.objectContaining({
              id: 'deepening',
              position: 1,
            }),
            expect.objectContaining({
              id: 'mastery',
              position: 2,
            }),
          ]);

        expect(
          concept.content.sections
            .filter(
              (section) =>
                section.levelId
                === 'foundation',
            ),
        ).toHaveLength(5);

        expect(
          concept.content.sections
            .filter(
              (section) =>
                section.levelId
                === 'deepening',
            ),
        ).toHaveLength(12);

        expect(
          concept.content.sections
            .filter(
              (section) =>
                section.levelId
                === 'mastery',
            ),
        ).toHaveLength(12);

        expect(
          concept.content.sections,
        ).toHaveLength(29);

        expect(
          concept.content.sections
            .filter(
              (section) =>
                !section.levelId,
            ),
        ).toHaveLength(0);
      },
    );

    it(
      'locks session topology and stepOrder',
      async () => {
        const sessions =
          await loadSessions();

        expect(sessions)
          .toHaveLength(17);

        expect(sessions).toEqual(expect.arrayContaining([
          expect.objectContaining({
            id: 'js-promise-flow-mastery-promise-any-01',
            levelId: 'mastery',
            position: 5,
            kind: 'practice',
          }),
        ]));

        const expected = {
          foundation: [6, 18],
          deepening: [5, 21],
          mastery: [6, 24],
        } as const;

        for (
          const [
            level,
            [sessionCount, stepCount],
          ]
          of Object.entries(expected)
        ) {
          const selected =
            sessions.filter(
              (session) =>
                session.levelId
                === level,
            );

          expect(selected)
            .toHaveLength(
              sessionCount,
            );

          expect(
            selected.flatMap(
              (session) =>
                session.steps,
            ),
          ).toHaveLength(
            stepCount,
          );

          expect(
            selected
              .map(
                (session) =>
                  session.position,
              )
              .sort(
                (a, b) => a - b,
              ),
          ).toEqual(
            Array.from(
              {
                length:
                  sessionCount,
              },
              (_, index) =>
                index,
            ),
          );

          for (
            const session
            of selected
          ) {
            session.steps.forEach(
              (step, index) => {
                expect(
                  step.stepOrder,
                  `${session.id}/${step.id}`,
                ).toBe(index + 1);
              },
            );
          }
        }
      },
    );

    it(
      'locks published progression sessions and exercise distribution',
      async () => {
        const sessions =
          await loadSessions();

        for (const session of sessions) {
          expect(
            session.conceptId,
          ).toBe(
            'js-promise-flow',
          );

          expect(
            session.requiredForProgression,
          ).toBe(true);

          expect(
            session.status,
          ).toBe('published');

          expect(
            [
              'quiz',
              'practice',
              'checkpoint',
            ],
          ).toContain(
            session.kind,
          );
        }

        const steps =
          sessions.flatMap(
            (session) =>
              session.steps,
          );

        const counts =
          Object.fromEntries(
            [
              'code-reading',
              'predict-output',
              'find-error',
              'fix-code',
            ].map(
              (type) => [
                type,
                steps.filter(
                  (step) =>
                    step.type === type,
                ).length,
              ],
            ),
          );

        expect(counts)
          .toEqual({
            'code-reading': 19,
            'predict-output': 20,
            'find-error': 12,
            'fix-code': 12,
          });
      },
    );

    it(
      'uses compound sessionId + stepId identity',
      async () => {
        const sessions =
          await loadSessions();

        const identities =
          sessions.flatMap(
            (session) =>
              session.steps.map(
                (step) =>
                  `${session.id}:${step.id}`,
              ),
          );

        expect(
          new Set(
            identities,
          ).size,
        ).toBe(
          identities.length,
        );
      },
    );

    it(
      'keeps all 12 fix-code exercises protected by the private registry',
      async () => {
        const sessions =
          await loadSessions();

        const registry =
          await readFile(
            registryPath,
            'utf8',
          );

        const fixCodes =
          sessions.flatMap(
            (session) =>
              session.steps
                .filter(
                  (step) =>
                    step.type
                    === 'fix-code',
                )
                .map(
                  (step) => ({
                    sessionId:
                      session.id,
                    exerciseId:
                      step.id,
                  }),
                ),
          );

        expect(fixCodes)
          .toHaveLength(12);

        for (const item of fixCodes) {
          const expression =
            new RegExp(
              `verifierKey\\(\\s*['"]${item.sessionId}['"]\\s*,\\s*['"]${item.exerciseId}['"]`,
              'gm',
            );

          expect(
            [...registry.matchAll(
              expression,
            )],
            `${item.sessionId}/${item.exerciseId}`,
          ).toHaveLength(1);
        }
      },
    );

    it(
      'locks public behavioral test cases',
      async () => {
        const sessions =
          await loadSessions();

        const fixCodes =
          sessions.flatMap(
            (session) =>
              session.steps.filter(
                (step) =>
                  step.type
                  === 'fix-code',
              ),
          );

        const publicCases =
          fixCodes.flatMap(
            (step) =>
              step.testCases ?? [],
          );

        expect(publicCases)
          .toHaveLength(23);

        for (
          const testCase
          of publicCases
        ) {
          expect(
            typeof testCase.call,
          ).toBe('string');

          expect(testCase)
            .toHaveProperty(
              'expected',
            );
        }
      },
    );
  },
);
