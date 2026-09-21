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
  'server-only verifier cases',
  () => {
    it(
      'augments the Arrays pilot with backend-only cases without changing the generated public manifest',
      () => {
        const publicSession =
          verifierManifest.sessions.find(
            (session) =>
              session.id
              === 'js-arrays-filter-mutation-01',
          );

        expect(
          publicSession,
        ).toBeDefined();

        const publicStep =
          publicSession?.steps.find(
            (step) =>
              step.id === 'step-4',
          );

        expect(
          publicStep?.type,
        ).toBe(
          'fix-code',
        );

        if (
          publicStep === undefined
        ) {
          throw new Error(
            'Expected fix-code pilot step',
          );
        }

        expect(
          publicStep.testCases,
        ).toHaveLength(
          3,
        );

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

        expect(
          verification.kind,
        ).toBe(
          'requires-code-execution',
        );

        if (
          verification.kind
          !== 'requires-code-execution'
        ) {
          throw new Error(
            'Expected code execution verification',
          );
        }

        /*
         * 3 public manifest cases
         * + 2 hidden server cases
         * + 1 output-only behavioral oracle case.
         */
        expect(
          verification.testCases,
        ).toHaveLength(
          6,
        );

        expect(
          verification.testCases.some(
            (testCase) =>
              testCase.description
              ===
              'oracle conductual: compara únicamente el output canónico',
          ),
        ).toBe(true);
      },
    );

    it(
      'accepts an alternative behaviorally correct implementation against public and hidden cases',
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

        await expect(
          executor.execute({
            code:
              verification.userCode,

            testCases:
              verification.testCases,
          }),
        ).resolves.toEqual({
          passed: true,
          reason: 'passed',
        });
      },
      15_000,
    );

    it(
      'rejects hardcoding that knows every public example but not the server-only cases',
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
                  const key =
                    JSON.stringify(numeros);

                  if (
                    key
                    === JSON.stringify(
                      [-2, 0, 3, 5],
                    )
                  ) {
                    return [3, 5];
                  }

                  if (
                    key === '[]'
                  ) {
                    return [];
                  }

                  if (
                    key
                    === JSON.stringify(
                      [-3, -1],
                    )
                  ) {
                    return [];
                  }

                  return [];
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

        await expect(
          executor.execute({
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
