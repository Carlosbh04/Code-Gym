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
  evaluatePedagogicalRequirements,
} from '../src/content/pedagogical-verifier.js';

import {
  StaticVerifierManifestRepository,
} from '../src/content/verifier-manifest-repository.js';

interface PrivateCoverageTarget {
  readonly sessionId: string;
  readonly exerciseId: string;
  readonly hiddenCaseCount: number;
  readonly solution: string;
}

const TARGETS:
readonly PrivateCoverageTarget[] =
  Object.freeze([
    Object.freeze({
      sessionId:
        'js-arrays-coding-transform-01',
      exerciseId:
        'step-1',
      hiddenCaseCount:
        2,
      solution: `
        function aplicarDescuento(precios) {
          const resultado = [];

          for (const precio of precios) {
            resultado.push(precio * 0.9);
          }

          return resultado;
        }
      `,
    }),

    Object.freeze({
      sessionId:
        'js-arrays-map-vs-foreach-01',
      exerciseId:
        'step-4',
      hiddenCaseCount:
        2,
      solution: `
        function dobles(numeros) {
          return numeros.map(
            (numero) => numero * 2,
          );
        }
      `,
    }),

    Object.freeze({
      sessionId:
        'js-arrays-reduce-accumulator-01',
      exerciseId:
        'step-4',
      hiddenCaseCount:
        2,
      solution: `
        function sumar(numeros) {
          return numeros.reduce(
            (total, numero) => total + numero,
            0,
          );
        }
      `,
    }),

    Object.freeze({
      sessionId:
        'js-closures-coding-counter-01',
      exerciseId:
        'step-1',
      hiddenCaseCount:
        2,
      solution: `
        function crearContador() {
          let contador = 0;

          return function contar() {
            contador += 1;
            return contador;
          };
        }
      `,
    }),

    Object.freeze({
      sessionId:
        'js-closures-live-binding-01',
      exerciseId:
        'step-4',
      hiddenCaseCount:
        2,
      solution: `
        var moneda = 'EUR';

        function crearPrecio(base) {
          const monedaAlCrear = moneda;

          return function precio() {
            return \`\${base} \${monedaAlCrear}\`;
          };
        }
      `,
    }),

    Object.freeze({
      sessionId:
        'js-closures-loop-capture-01',
      exerciseId:
        'step-4',
      hiddenCaseCount:
        2,
      solution: `
        function crearMarcadores() {
          const marcadores = [];

          for (var i = 0; i < 3; i += 1) {
            marcadores.push(
              ((vuelta) => () => vuelta)(i),
            );
          }

          return marcadores;
        }
      `,
    }),

    Object.freeze({
      sessionId:
        'js-closures-shared-state-01',
      exerciseId:
        'step-4',
      hiddenCaseCount:
        2,
      solution: `
        function crearRegistro() {
          let visitas = 0;

          return function anotar() {
            visitas += 1;
            return visitas;
          };
        }
      `,
    }),

    Object.freeze({
      sessionId:
        'js-errors-finally-cleanup-01',
      exerciseId:
        'step-4',
      hiddenCaseCount:
        2,
      solution: `
        function ejecutar(falla) {
          const recurso = { cerrado: false };

          try {
            if (falla) {
              throw new Error('fallo');
            }

            return recurso;
          } finally {
            recurso.cerrado = true;
          }
        }
      `,
    }),

    Object.freeze({
      sessionId:
        'js-functions-return-flow-01',
      exerciseId:
        'step-4',
      hiddenCaseCount:
        2,
      solution: `
        function validar(usuario) {
          const errores = [];

          if (!usuario.nombre) {
            errores.push('falta el nombre');
          }

          if (!usuario.email) {
            errores.push('falta el email');
          }

          return errores;
        }
      `,
    }),

    Object.freeze({
      sessionId:
        'js-functions-scope-hoisting-01',
      exerciseId:
        'step-4',
      hiddenCaseCount:
        3,
      solution: `
        function nivel(puntos) {
          return puntos >= 100
            ? 'avanzado'
            : 'inicial';
        }
      `,
    }),
  ]);

function createVerifier():
ContentVerifier {
  return new ContentVerifier(
    new StaticVerifierManifestRepository(
      verifierManifest,
    ),
  );
}

function findPublicCaseCount(
  target: PrivateCoverageTarget,
): number {
  const session =
    verifierManifest.sessions.find(
      (candidate) =>
        candidate.id
        === target.sessionId,
    );

  const step =
    session?.steps.find(
      (candidate) =>
        candidate.id
        === target.exerciseId,
    );

  if (
    step === undefined
    || step.type !== 'fix-code'
  ) {
    throw new Error(
      `Fix-code no encontrado: ${target.sessionId}/${target.exerciseId}`,
    );
  }

  return step.testCases.length;
}

describe(
  'JS-CONTENT-02 private verifier coverage',
  () => {
    it.each(
      TARGETS,
    )(
      'keeps $sessionId/$exerciseId private cases server-only',
      (target) => {
        const verifier =
          createVerifier();

        const publicCaseCount =
          findPublicCaseCount(
            target,
          );

        const preview =
          verifier.prepareCodePreview({
            sessionId:
              target.sessionId,
            exerciseId:
              target.exerciseId,
            code:
              target.solution,
          });

        const authoritative =
          verifier.verifyAnswer({
            sessionId:
              target.sessionId,
            exerciseId:
              target.exerciseId,
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
          publicCaseCount,
        );

        expect(
          authoritative.testCases,
        ).toHaveLength(
          publicCaseCount
          + target.hiddenCaseCount,
        );
      },
    );

    it(
      'accepts behaviorally correct solutions across all ten exercises',
      async () => {
        const verifier =
          createVerifier();

        const executor =
          new ProcessCodeExecutionService();

        for (const target of TARGETS) {
          const verification =
            verifier.verifyAnswer({
              sessionId:
                target.sessionId,
              exerciseId:
                target.exerciseId,
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
            `${target.sessionId}/${target.exerciseId}`,
          ).resolves.toEqual({
            passed: true,
            reason: 'passed',
          });
        }
      },
      60_000,
    );

    it(
      'requires techniques only where the exercise explicitly teaches them',
      () => {
        const verifier =
          createVerifier();

        for (const target of TARGETS) {
          const verification =
            verifier.verifyAnswer({
              sessionId:
                target.sessionId,
              exerciseId:
                target.exerciseId,
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

          if (
            target.sessionId
            === 'js-arrays-map-vs-foreach-01'
          ) {
            expect(
              verification.pedagogicalRequirements,
            ).toEqual([
              {
                kind:
                  'required-array-method',
                method:
                  'map',
                feedback:
                  'El resultado es correcto, pero este ejercicio requiere practicar Array.map() en lugar de Array.forEach().',
              },
            ]);

            expect(
              evaluatePedagogicalRequirements(
                `
                  function dobles(numeros) {
                    const resultado = [];
                    for (const numero of numeros) resultado.push(numero * 2);
                    return resultado;
                  }
                `,
                verification.pedagogicalRequirements,
              ),
            ).toMatchObject({
              requirementsMet:
                false,
            });

            continue;
          }

          if (
            target.sessionId
            === 'js-arrays-reduce-accumulator-01'
          ) {
            expect(
              verification.pedagogicalRequirements,
            ).toEqual([
              {
                kind:
                  'required-array-method',
                method:
                  'reduce',
                feedback:
                  'El resultado es correcto, pero este ejercicio requiere practicar Array.reduce() con valor inicial.',
              },
            ]);

            expect(
              evaluatePedagogicalRequirements(
                `
                  function sumar(numeros) {
                    let total = 0;
                    for (const numero of numeros) total += numero;
                    return total;
                  }
                `,
                verification.pedagogicalRequirements,
              ),
            ).toMatchObject({
              requirementsMet:
                false,
            });

            continue;
          }

          expect(
            verification.pedagogicalRequirements,
          ).toEqual([]);
        }
      },
    );

    it(
      'rejects an Arrays solution hardcoded only for the published examples',
      async () => {
        const verification =
          createVerifier()
            .verifyAnswer({
              sessionId:
                'js-arrays-coding-transform-01',
              exerciseId:
                'step-1',
              answer: `
                function aplicarDescuento(precios) {
                  if (precios.length === 0) return [];
                  if (precios[0] === 100) return [90, 45];
                  return precios;
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
