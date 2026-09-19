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

const SESSION_ID =
  'js-variables-basics-01';

const EXERCISE_ID =
  'step-4';

const ALTERNATIVE_CORRECT = `
  function incrementarContador(inicial) {
    return inicial + 1;
  }
`;

const PUBLIC_ONLY_HARDCODE = `
  function incrementarContador(inicial) {
    if (inicial === 0) {
      return 1;
    }

    if (inicial === 5) {
      return 6;
    }

    return 0;
  }
`;

function createVerifier():
ContentVerifier {
  return new ContentVerifier(
    new StaticVerifierManifestRepository(
      verifierManifest,
    ),
  );
}

describe(
  'Variables Practice · real coding contract',
  () => {
    it(
      'keeps Ejecutar public while Comprobar adds private behavioral cases',
      async () => {
        const verifier =
          createVerifier();

        const executor =
          new ProcessCodeExecutionService();

        /*
         * Ejecutar:
         * only public test cases from the generated manifest.
         */
        const preview =
          verifier.prepareCodePreview({
            sessionId:
              SESSION_ID,

            exerciseId:
              EXERCISE_ID,

            code:
              PUBLIC_ONLY_HARDCODE,
          });

        expect(
          preview.testCases,
        ).toHaveLength(
          2,
        );

        expect(
          preview.testCases.map(
            (testCase) =>
              testCase.input,
          ),
        ).toEqual([
          0,
          5,
        ]);

        await expect(
          executor.execute({
            code:
              preview.userCode,

            testCases:
              preview.testCases,
          }),
        ).resolves.toEqual({
          passed: true,
          reason: 'passed',
        });

        /*
         * Comprobar:
         * public + server-owned private cases.
         */
        const authoritative =
          verifier.verifyAnswer({
            sessionId:
              SESSION_ID,

            exerciseId:
              EXERCISE_ID,

            answer:
              PUBLIC_ONLY_HARDCODE,
          });

        if (
          authoritative.kind
          !== 'requires-code-execution'
        ) {
          throw new Error(
            'Expected fix-code verification',
          );
        }

        expect(
          authoritative.testCases,
        ).toHaveLength(
          5,
        );

        expect(
          authoritative.testCases.map(
            (testCase) =>
              testCase.input,
          ),
        ).toEqual([
          0,
          5,
          -3,
          41,
          1.5,
        ]);

        expect(
          authoritative.pedagogicalRequirements,
        ).toEqual([]);

        await expect(
          executor.execute({
            code:
              authoritative.userCode,

            testCases:
              authoritative.testCases,
          }),
        ).resolves.toEqual({
          passed: false,
          reason: 'failed',
        });
      },
      15_000,
    );

    it(
      'accepts an alternative correct implementation without exact-source matching',
      async () => {
        const verifier =
          createVerifier();

        const verification =
          verifier.verifyAnswer({
            sessionId:
              SESSION_ID,

            exerciseId:
              EXERCISE_ID,

            answer:
              ALTERNATIVE_CORRECT,
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

        expect(
          verification.pedagogicalRequirements,
        ).toEqual([]);

        const pedagogical =
          evaluatePedagogicalRequirements(
            verification.userCode,
            verification.pedagogicalRequirements,
          );

        const combined =
          combineVerificationResult(
            execution.passed,
            pedagogical,
          );

        expect(
          combined,
        ).toEqual({
          functionalCorrect: true,
          pedagogicalRequirementsMet: true,
          overallPassed: true,
          feedback: [],
        });
      },
      15_000,
    );
  },
);
