import {
  readdirSync,
  readFileSync,
} from 'node:fs';

import {
  join,
} from 'node:path';

import {
  fileURLToPath,
} from 'node:url';

import {
  describe,
  expect,
  it,
} from 'vitest';

import {
  ProcessCodeExecutionService,
} from '../src/code-execution/process-code-execution-service.js';

import {
  ContentVerifier,
} from '../src/content/content-verifier.js';

import {
  verifierManifest,
} from '../src/content/generated/verifier-manifest.js';

import {
  resolvePrivateVerifierConfig,
} from '../src/content/private-verifier-registry.js';

import {
  StaticVerifierManifestRepository,
} from '../src/content/verifier-manifest-repository.js';

const FUNCTIONS_ROOT =
  fileURLToPath(
    new URL(
      '../../frontend/src/data/content/javascript/functions/',
      import.meta.url,
    ),
  );

interface StaticStep {
  readonly id: string;
  readonly type: string;
  readonly testCases:
    readonly unknown[] | null;
}

interface StaticSession {
  readonly id: string;
  readonly conceptId: string;
  readonly technologyId: string;
  readonly version: string;
  readonly status: string;
  readonly difficulty: string;
  readonly kind: string;
  readonly levelId: string;
  readonly position: number;
  readonly passingPercentage:
    number | null;
  readonly requiredForProgression: boolean;
  readonly steps: readonly StaticStep[];
}

interface FunctionsIndex {
  readonly levels:
    readonly {
      readonly id: string;
      readonly position: number;
    }[];
  readonly content: {
    readonly sections:
      readonly {
        readonly levelId?: string;
      }[];
  };
}

interface FixCodeTarget {
  readonly sessionId: string;
  readonly publicCases: number;
  readonly hiddenCases: number;
  readonly solution: string;
}

const FIX_CODE_TARGETS:
readonly FixCodeTarget[] =
  Object.freeze([
    Object.freeze({
      sessionId:
        'js-functions-foundation-reference-execution-01',
      publicCases:
        3,
      hiddenCases:
        2,
      solution: `
        function crearSaludo(nombre = 'Invitado') {
          return 'Hola, ' + nombre;
        }
      `,
    }),
    Object.freeze({
      sessionId:
        'js-functions-deepening-callbacks-01',
      publicCases:
        3,
      hiddenCases:
        2,
      solution: `
        function aplicarOperacion(valor, operacion) {
          return operacion(valor);
        }
      `,
    }),
    Object.freeze({
      sessionId:
        'js-functions-mastery-pipeline-effects-01',
      publicCases:
        3,
      hiddenCases:
        2,
      solution: `
        function ejecutarPipeline(
          valor,
          primero,
          segundo,
          notificar,
        ) {
          const resultado = segundo(
            primero(valor),
          );
          notificar(resultado);
          return resultado;
        }
      `,
    }),
    Object.freeze({
      sessionId:
        'js-function-basics-mastery-recursion-01',
      publicCases:
        2,
      hiddenCases:
        1,
      solution: `
        function sumarAnidados(valores) {
          return valores.reduce(
            (total, valor) =>
              total
              + (
                Array.isArray(valor)
                  ? sumarAnidados(valor)
                  : valor
              ),
            0,
          );
        }
      `,
    }),
  ]);

function readJson(
  path: string,
): unknown {
  return JSON.parse(
    readFileSync(
      path,
      'utf8',
    ),
  ) as unknown;
}

function loadSessions():
readonly StaticSession[] {
  const sessionsRoot =
    join(
      FUNCTIONS_ROOT,
      'sessions',
    );

  return readdirSync(
    sessionsRoot,
  )
    .filter(
      (name) =>
        name.endsWith('.json'),
    )
    .map(
      (name) =>
        readJson(
          join(
            sessionsRoot,
            name,
          ),
        ) as StaticSession,
    );
}

function createVerifier():
ContentVerifier {
  return new ContentVerifier(
    new StaticVerifierManifestRepository(
      verifierManifest,
    ),
  );
}

describe(
  'Functions three-level content contract',
  () => {
    it(
      'declares level-aware theory and ordered quiz/practice/checkpoint sessions',
      () => {
        const index =
          readJson(
            join(
              FUNCTIONS_ROOT,
              'index.json',
            ),
          ) as FunctionsIndex;

        expect(
          index.levels.map(
            (level) => [
              level.id,
              level.position,
            ],
          ),
        ).toEqual([
          ['foundation', 0],
          ['deepening', 1],
          ['mastery', 2],
        ]);

        const theoryCounts =
          index.content.sections
            .reduce<
              Record<
                string,
                typeof index.content.sections
              >
            >(
              (
                groups,
                section,
              ) => {
                const levelId =
                  section.levelId
                  ?? 'foundation';

                groups[levelId] = [
                  ...(
                    groups[levelId]
                    ?? []
                  ),
                  section,
                ];

                return groups;
              },
              {},
            );

        expect(
          theoryCounts.foundation,
        ).toHaveLength(
          18,
        );

        expect(
          theoryCounts.deepening,
        ).toHaveLength(
          18,
        );

        expect(
          theoryCounts.mastery,
        ).toHaveLength(
          18,
        );

        const sessions =
          loadSessions();

        expect(
          sessions,
        ).toHaveLength(
          18,
        );

        expect(sessions).toEqual(expect.arrayContaining([
          expect.objectContaining({
            id: 'js-function-basics-foundation-recursion-basics-01',
            levelId: 'foundation',
            position: 4,
            kind: 'practice',
          }),
          expect.objectContaining({
            id: 'js-function-basics-deepening-recursive-structures-01',
            levelId: 'deepening',
            position: 4,
            kind: 'practice',
          }),
          expect.objectContaining({
            id: 'js-function-basics-mastery-recursion-01',
            levelId: 'mastery',
            position: 4,
            kind: 'practice',
          }),
        ]));

        for (
          const levelId
          of [
            'foundation',
            'deepening',
            'mastery',
          ]
        ) {
          const ordered =
            sessions
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
            ordered.map(
              (session) =>
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
            ordered.map(
              (session) =>
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
            ordered.every(
              (session) =>
                session.requiredForProgression,
            ),
          ).toBe(true);

          for (const session of ordered) {
            expect(session).toMatchObject({
              conceptId:
                'js-function-basics',
              technologyId:
                'javascript',
              status:
                'published',
              difficulty:
                levelId === 'foundation'
                  ? 'beginner'
                  : levelId === 'deepening'
                    ? 'intermediate'
                    : 'advanced',
              passingPercentage:
                session.kind === 'quiz'
                  ? 100
                  : null,
            });

            expect(
              session.version,
            ).toMatch(
              /^\d+\.\d+\.\d+$/,
            );
          }
        }
      },
    );

    it(
      'contains the intended exercise density and generated manifest entries',
      () => {
        const sessions =
          loadSessions();

        const typeCounts =
          new Map<
            string,
            number
          >();

        for (const session of sessions) {
          expect(
            verifierManifest.sessions.some(
              (entry) =>
                entry.id
                === session.id,
            ),
          ).toBe(true);

          for (const step of session.steps) {
            typeCounts.set(
              step.type,
              (
                typeCounts.get(
                  step.type,
                )
                ?? 0
              ) + 1,
            );
          }
        }

        expect(
          sessions.reduce(
            (total, session) =>
              total
              + session.steps.length,
            0,
          ),
        ).toBe(
          73,
        );

        expect(
          Object.fromEntries(
            typeCounts,
          ),
        ).toEqual({
          'fix-code': 13,
          'code-reading': 21,
          'predict-output': 24,
          'find-error': 15,
        });
      },
    );

    it.each(
      FIX_CODE_TARGETS,
    )(
      'keeps $sessionId hidden cases out of public content and preview',
      (target) => {
        const session =
          loadSessions()
            .find(
              (candidate) =>
                candidate.id
                === target.sessionId,
            );

        const publicStep =
          session?.steps.find(
            (step) =>
              step.id
              === 'step-4',
          );

        expect(
          publicStep?.testCases,
        ).toHaveLength(
          target.publicCases,
        );

        const privateConfig =
          resolvePrivateVerifierConfig(
            target.sessionId,
            'step-4',
          );

        expect(
          privateConfig.hiddenTestCases,
        ).toHaveLength(
          target.hiddenCases,
        );

        expect(
          privateConfig.pedagogicalRequirements,
        ).toEqual([]);

        const verifier =
          createVerifier();

        const preview =
          verifier.prepareCodePreview({
            sessionId:
              target.sessionId,
            exerciseId:
              'step-4',
            code:
              target.solution,
          });

        const authoritative =
          verifier.verifyAnswer({
            sessionId:
              target.sessionId,
            exerciseId:
              'step-4',
            answer:
              target.solution,
          });

        if (
          authoritative.kind
          !== 'requires-code-execution'
        ) {
          throw new Error(
            'Expected code execution verification',
          );
        }

        expect(
          preview.testCases,
        ).toHaveLength(
          target.publicCases,
        );

        expect(
          authoritative.testCases,
        ).toHaveLength(
          target.publicCases
          + target.hiddenCases,
        );

        for (
          const hiddenCase
          of privateConfig.hiddenTestCases
        ) {
          expect(
            JSON.stringify(
              session,
            ),
          ).not.toContain(
            hiddenCase.description,
          );
        }
      },
    );

    it(
      'accepts behaviorally correct implementations for every targeted fix-code exercise',
      async () => {
        const verifier =
          createVerifier();

        const executor =
          new ProcessCodeExecutionService();

        for (const target of FIX_CODE_TARGETS) {
          const verification =
            verifier.verifyAnswer({
              sessionId:
                target.sessionId,
              exerciseId:
                'step-4',
              answer:
                target.solution,
            });

          if (
            verification.kind
            !== 'requires-code-execution'
          ) {
            throw new Error(
              'Expected code execution verification',
            );
          }

          await expect(
            executor.execute({
              code:
                verification.userCode,
              testCases:
                verification.testCases,
            }),
            target.sessionId,
          ).resolves.toEqual({
            passed: true,
            reason: 'passed',
          });
        }
      },
      60_000,
    );

    it(
      'rejects a solution hardcoded only for the public callback examples',
      async () => {
        const verification =
          createVerifier()
            .verifyAnswer({
              sessionId:
                'js-functions-deepening-callbacks-01',
              exerciseId:
                'step-4',
              answer: `
                function aplicarOperacion(valor) {
                  if (valor === 4) return 12;
                  if (valor === -2) return 2;
                  if (valor === ' ada ') return 'ADA';
                  return valor;
                }
              `,
            });

        if (
          verification.kind
          !== 'requires-code-execution'
        ) {
          throw new Error(
            'Expected code execution verification',
          );
        }

        await expect(
          new ProcessCodeExecutionService()
            .execute({
              code:
                verification.userCode,
              testCases:
                verification.testCases,
            }),
        ).resolves.toEqual({
          passed: false,
          reason: 'failed',
        });
      },
      15_000,
    );
  },
);
