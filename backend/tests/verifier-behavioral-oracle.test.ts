import {
  describe,
  expect,
  it,
} from 'vitest';

import {
  ContentVerifier,
} from '../src/content/content-verifier.js';

import {
  verifierManifest,
} from '../src/content/generated/verifier-manifest.js';

import {
  StaticVerifierManifestRepository,
} from '../src/content/verifier-manifest-repository.js';

import {
  ProcessCodeExecutionService,
} from '../src/code-execution/process-code-execution-service.js';

const SESSION_ID =
  'js-arrays-filter-mutation-01';

const EXERCISE_ID =
  'step-4';

describe(
  'behavioral oracle · output only',
  () => {
    const verifier =
      new ContentVerifier(
        new StaticVerifierManifestRepository(
          verifierManifest,
        ),
      );

    it(
      'adds server-owned oracle output cases to the existing execution contract',
      async () => {
        const verification =
          verifier.verifyAnswer({
            sessionId:
              SESSION_ID,

            exerciseId:
              EXERCISE_ID,

            answer: `
              function positivos(valores) {
                return valores.filter(
                  (valor) => valor > 0,
                );
              }
            `,
          });

        if (
          verification.kind
          !== 'requires-code-execution'
        ) {
          throw new Error(
            'Expected fix-code verification',
          );
        }

        expect(
          verification.testCases.some(
            (testCase) =>
              testCase.description
              ===
              'oracle conductual: compara únicamente el output canónico',
          ),
        ).toBe(true);

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
      'rejects code whose observable output disagrees with the oracle',
      async () => {
        const verification =
          verifier.verifyAnswer({
            sessionId:
              SESSION_ID,

            exerciseId:
              EXERCISE_ID,

            answer: `
              function positivos(valores) {
                return valores
                  .filter(
                    (valor) => valor > 0,
                  )
                  .map(
                    (valor) =>
                      valor === 12
                        ? 999
                        : valor,
                  );
              }
            `,
          });

        if (
          verification.kind
          !== 'requires-code-execution'
        ) {
          throw new Error(
            'Expected fix-code verification',
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

    it(
      'accepts different source code when behavior matches the canonical outputs',
      async () => {
        const verification =
          verifier.verifyAnswer({
            sessionId:
              SESSION_ID,

            exerciseId:
              EXERCISE_ID,

            answer: `
              function positivos(valores) {
                const resultado =
                  valores.filter(
                    (numero) =>
                      numero > 0,
                  );

                return Array.from(
                  resultado,
                );
              }
            `,
          });

        if (
          verification.kind
          !== 'requires-code-execution'
        ) {
          throw new Error(
            'Expected fix-code verification',
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
  },
);
