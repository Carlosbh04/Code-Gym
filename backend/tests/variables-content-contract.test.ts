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

const VARIABLES_ROOT =
  fileURLToPath(
    new URL(
      '../../frontend/src/data/content/javascript/fundamentals/',
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
  readonly kind: string;
  readonly levelId: string;
  readonly position: number;
  readonly requiredForProgression: boolean;
  readonly steps: readonly StaticStep[];
}

interface VariablesIndex {
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
  readonly hiddenCases: number;
  readonly solution: string;
}

const FIX_CODE_TARGETS:
readonly FixCodeTarget[] =
  Object.freeze([
    Object.freeze({
      sessionId:
        'js-variables-deepening-shadowing-01',
      hiddenCases:
        2,
      solution: `
        function normalizarNombre(nombre) {
          const limpio = nombre.trim();
          return limpio || 'sin nombre';
        }
      `,
    }),
    Object.freeze({
      sessionId:
        'js-variables-deepening-const-values-01',
      hiddenCases:
        2,
      solution: `
        function agregarEtiqueta(perfil, etiqueta) {
          perfil.etiquetas.push(etiqueta);
          return perfil;
        }
      `,
    }),
    Object.freeze({
      sessionId:
        'js-variables-deepening-tdz-coercion-01',
      hiddenCases:
        2,
      solution: `
        function calcularTotal(cantidadTexto, precio) {
          return Number(cantidadTexto) * precio;
        }
      `,
    }),
    Object.freeze({
      sessionId:
        'js-variables-deepening-checkpoint-01',
      hiddenCases:
        2,
      solution: `
        function aplicarMovimiento(saldoInicial, movimientoTexto) {
          const saldo = Number(saldoInicial);
          return movimientoTexto === ''
            ? saldo
            : saldo + Number(movimientoTexto);
        }
      `,
    }),
    Object.freeze({
      sessionId:
        'js-variables-mastery-nested-scopes-01',
      hiddenCases:
        2,
      solution: `
        function aplicarAjustes(base, ajustes) {
          let total = Number(base);
          for (const ajuste of ajustes) total += Number(ajuste);
          return total;
        }
      `,
    }),
    Object.freeze({
      sessionId:
        'js-variables-mastery-aliasing-01',
      hiddenCases:
        2,
      solution: `
        function actualizarPreferencia(config, tema) {
          return { ...config, tema };
        }
      `,
    }),
    Object.freeze({
      sessionId:
        'js-variables-mastery-state-tracing-01',
      hiddenCases:
        2,
      solution: `
        function resumirCambios(valorInicial, cambios) {
          const inicial = Number(valorInicial);
          let final = inicial;
          for (const cambio of cambios) final += Number(cambio);
          return { inicial, final, diferencia: final - inicial };
        }
      `,
    }),
    Object.freeze({
      sessionId:
        'js-variables-mastery-checkpoint-01',
      hiddenCases:
        3,
      solution: `
        function construirResultado(valorInicial, cambioTexto, bloqueado) {
          const inicial = Number(valorInicial);
          const actual = bloqueado
            ? inicial
            : inicial + Number(cambioTexto);
          return {
            inicial,
            actual,
            diferencia: actual - inicial,
            bloqueado,
          };
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
      VARIABLES_ROOT,
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
  'Variables three-level content contract',
  () => {
    it(
      'declares level-aware theory and ordered quiz/practice/checkpoint sessions',
      () => {
        const index =
          readJson(
            join(
              VARIABLES_ROOT,
              'index.json',
            ),
          ) as VariablesIndex;

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
          9,
        );

        expect(
          theoryCounts.deepening,
        ).toHaveLength(
          11,
        );

        expect(
          theoryCounts.mastery,
        ).toHaveLength(
          11,
        );

        const sessions =
          loadSessions();

        expect(
          sessions,
        ).toHaveLength(
          13,
        );

        for (
          const levelId
          of [
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
            'checkpoint',
          ]);

          expect(
            ordered.every(
              (session) =>
                session.requiredForProgression,
            ),
          ).toBe(true);
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
          51,
        );

        expect(
          Object.fromEntries(
            typeCounts,
          ),
        ).toEqual({
          'code-reading': 16,
          'predict-output': 17,
          'find-error': 9,
          'fix-code': 9,
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
          3,
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
          3,
        );

        expect(
          authoritative.testCases,
        ).toHaveLength(
          3
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
      'accepts behaviorally correct implementations for all eight new fix-code exercises',
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
      'rejects a solution hardcoded only for the public shadowing examples',
      async () => {
        const verification =
          createVerifier()
            .verifyAnswer({
              sessionId:
                'js-variables-deepening-shadowing-01',
              exerciseId:
                'step-4',
              answer: `
                function normalizarNombre(nombre) {
                  if (nombre === '  Ada  ') return 'Ada';
                  if (nombre === '') return 'sin nombre';
                  return nombre;
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
