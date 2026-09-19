import type {
  PedagogicalRequirement,
} from './pedagogical-verifier.js';

import type {
  VerifierTestCase,
} from './verifier-manifest.js';

export interface PrivateVerifierConfig {
  readonly hiddenTestCases:
    readonly VerifierTestCase[];

  readonly pedagogicalRequirements:
    readonly PedagogicalRequirement[];
}

const EMPTY_CONFIG:
PrivateVerifierConfig =
  Object.freeze({
    hiddenTestCases:
      Object.freeze([]),

    pedagogicalRequirements:
      Object.freeze([]),
  });

const registry =
  new Map<
    string,
    PrivateVerifierConfig
  >([
    [
      verifierKey(
        'js-arrays-filter-mutation-01',
        'step-4',
      ),

      Object.freeze({
        hiddenTestCases:
          Object.freeze([
            Object.freeze({
              input:
                Object.freeze([
                  -8,
                  -1,
                  0,
                  1,
                  2,
                  7,
                ]),

              expected:
                Object.freeze([
                  1,
                  2,
                  7,
                ]),

              call:
                'positivos(input)',

              description:
                'valida positivos con negativos, cero y varios valores válidos',
            }),

            Object.freeze({
              input:
                Object.freeze([
                  4,
                  4,
                  -2,
                  9,
                  0,
                ]),

              expected:
                Object.freeze([
                  4,
                  4,
                  9,
                ]),

              call:
                'positivos(input)',

              description:
                'conserva positivos duplicados sin incluir cero',
            }),
          ]),

        pedagogicalRequirements:
          Object.freeze([
            Object.freeze({
              kind:
                'required-array-method',

              method:
                'filter',

              feedback:
                'El resultado es correcto, pero este ejercicio requiere practicar Array.filter().',
            }),
          ]),
      }),
    ],
  ]);

/**
 * Resolves server-owned verification configuration for one
 * canonical session/exercise pair.
 *
 * This registry does not execute learner code, calculate a verdict,
 * or persist progress. ContentVerifier remains the single verifier
 * authority and consumes this configuration as part of its contract.
 */
export function resolvePrivateVerifierConfig(
  sessionId: string,
  exerciseId: string,
): PrivateVerifierConfig {
  return (
    registry.get(
      verifierKey(
        sessionId,
        exerciseId,
      ),
    )
    ?? EMPTY_CONFIG
  );
}

function verifierKey(
  sessionId: string,
  exerciseId: string,
): string {
  return `${sessionId}/${exerciseId}`;
}
