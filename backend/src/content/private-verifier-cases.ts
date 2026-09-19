import type {
  PedagogicalRequirement,
} from './pedagogical-verifier.js';

import type {
  VerifierTestCase,
} from './verifier-manifest.js';

const EMPTY_CASES:
readonly VerifierTestCase[] =
  Object.freeze([]);

const privateCases =
  new Map<
    string,
    readonly VerifierTestCase[]
  >([
    [
      'js-arrays-filter-mutation-01/step-4',
      Object.freeze([
        Object.freeze({
          input: Object.freeze([
            -8,
            -1,
            0,
            1,
            2,
            7,
          ]),
          expected: Object.freeze([
            1,
            2,
            7,
          ]),
          call: 'positivos(input)',
          description:
            'valida positivos con negativos, cero y varios valores válidos',
        }),
        Object.freeze({
          input: Object.freeze([
            4,
            4,
            -2,
            9,
            0,
          ]),
          expected: Object.freeze([
            4,
            4,
            9,
          ]),
          call: 'positivos(input)',
          description:
            'conserva positivos duplicados sin incluir cero',
        }),
      ]),
    ],
  ]);

const EMPTY_REQUIREMENTS:
readonly PedagogicalRequirement[] =
  Object.freeze([]);

const privatePedagogicalRequirements =
  new Map<
    string,
    readonly PedagogicalRequirement[]
  >([
    [
      'js-arrays-filter-mutation-01/step-4',
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
    ],
  ]);

export function getPrivatePedagogicalRequirements(
  sessionId: string,
  exerciseId: string,
): readonly PedagogicalRequirement[] {
  return (
    privatePedagogicalRequirements.get(
      `${sessionId}/${exerciseId}`,
    )
    ?? EMPTY_REQUIREMENTS
  );
}


export function getPrivateVerifierTestCases(
  sessionId: string,
  exerciseId: string,
): readonly VerifierTestCase[] {
  return (
    privateCases.get(
      `${sessionId}/${exerciseId}`,
    )
    ?? EMPTY_CASES
  );
}
