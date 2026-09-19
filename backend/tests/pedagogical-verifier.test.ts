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
  combineVerificationResult,
  evaluatePedagogicalRequirements,
} from '../src/content/pedagogical-verifier.js';

import {
  StaticVerifierManifestRepository,
} from '../src/content/verifier-manifest-repository.js';

function createVerifier():
ContentVerifier {
  return new ContentVerifier(
    new StaticVerifierManifestRepository(
      verifierManifest,
    ),
  );
}

describe(
  'pedagogical verifier',
  () => {
    it(
      'passes when functional behavior and the required technique both pass',
      async () => {
        const verification =
          createVerifier()
            .verifyAnswer({
              sessionId:
                'js-arrays-filter-mutation-01',

              exerciseId:
                'step-4',

              answer: `
                function positivos(numeros) {
                  return numeros.filter(
                    (numero) => numero > 0,
                  );
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

        const executor =
          new ProcessCodeExecutionService();

        const execution =
          await executor.execute({
            code:
              verification.userCode,

            testCases:
              verification.testCases,
          });

        const pedagogical =
          evaluatePedagogicalRequirements(
            verification.userCode,
            verification.pedagogicalRequirements,
          );

        const result =
          combineVerificationResult(
            execution.passed,
            pedagogical,
          );

        expect(
          result,
        ).toEqual({
          functionalCorrect: true,
          pedagogicalRequirementsMet: true,
          overallPassed: true,
          feedback: [],
        });
      },
      15_000,
    );

    it(
      'distinguishes a functionally correct solution that misses the required filter technique',
      async () => {
        const verification =
          createVerifier()
            .verifyAnswer({
              sessionId:
                'js-arrays-filter-mutation-01',

              exerciseId:
                'step-4',

              answer: `
                function positivos(numeros) {
                  const resultado = [];

                  for (const numero of numeros) {
                    if (numero > 0) {
                      resultado.push(numero);
                    }
                  }

                  return resultado;
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

        const executor =
          new ProcessCodeExecutionService();

        const execution =
          await executor.execute({
            code:
              verification.userCode,

            testCases:
              verification.testCases,
          });

        expect(
          execution,
        ).toEqual({
          passed: true,
          reason: 'passed',
        });

        const pedagogical =
          evaluatePedagogicalRequirements(
            verification.userCode,
            verification.pedagogicalRequirements,
          );

        const result =
          combineVerificationResult(
            execution.passed,
            pedagogical,
          );

        expect(
          result.functionalCorrect,
        ).toBe(
          true,
        );

        expect(
          result.pedagogicalRequirementsMet,
        ).toBe(
          false,
        );

        expect(
          result.overallPassed,
        ).toBe(
          false,
        );

        expect(
          result.feedback,
        ).toEqual([
          'El resultado es correcto, pero este ejercicio requiere practicar Array.filter().',
        ]);
      },
      15_000,
    );

    it(
      'does not allow a comment or string mentioning filter to satisfy the requirement',
      () => {
        const verification =
          createVerifier()
            .verifyAnswer({
              sessionId:
                'js-arrays-filter-mutation-01',

              exerciseId:
                'step-4',

              answer: `
                function positivos(numeros) {
                  // numeros.filter((numero) => numero > 0)
                  const pista = ".filter(";
                  const resultado = [];

                  for (const numero of numeros) {
                    if (numero > 0) {
                      resultado.push(numero);
                    }
                  }

                  return resultado;
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

        const pedagogical =
          evaluatePedagogicalRequirements(
            verification.userCode,
            verification.pedagogicalRequirements,
          );

        expect(
          pedagogical.requirementsMet,
        ).toBe(
          false,
        );
      },
    );

    it(
      'does not impose a pedagogical requirement on unrelated functional exercises',
      () => {
        const verification =
          createVerifier()
            .verifyAnswer({
              sessionId:
                'js-arrays-coding-transform-01',

              exerciseId:
                'step-1',

              answer: `
                function aplicarDescuento(precios) {
                  return precios.map(
                    (precio) => precio * 0.9,
                  );
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

        expect(
          verification.pedagogicalRequirements,
        ).toEqual([]);
      },
    );
  },
);
