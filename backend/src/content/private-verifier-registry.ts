import type {
  PedagogicalRequirement,
} from './pedagogical-verifier.js';

import type {
  VerifierTestCase,
} from './verifier-manifest.js';

export interface BehavioralOracle {
  /**
   * Canonical server-owned input/output examples.
   *
   * The oracle contains no learner-source matcher and no
   * reference implementation. The existing isolated executor
   * evaluates learner code and compares only its observable
   * output with these expected values.
   */
  readonly outputCases:
    readonly VerifierTestCase[];
}

export interface PrivateVerifierConfig {
  readonly hiddenTestCases:
    readonly VerifierTestCase[];

  readonly pedagogicalRequirements:
    readonly PedagogicalRequirement[];

  readonly oracle:
    BehavioralOracle | null;
}

const EMPTY_CONFIG:
PrivateVerifierConfig =
  Object.freeze({
    hiddenTestCases:
      Object.freeze([]),

    pedagogicalRequirements:
      Object.freeze([]),

    oracle:
      null,
  });

const registry =
  new Map<
    string,
    PrivateVerifierConfig
  >([
    [
      verifierKey(
        'js-objects-dynamic-properties-01',
        'step-4',
      ),

      Object.freeze({
        hiddenTestCases:
          Object.freeze([
            Object.freeze({
              input:
                Object.freeze([
                  Object.freeze({
                    nombre: 'Ada',
                    activo: true,
                  }),
                  'activo',
                  false,
                ]),

              expected:
                false,

              call:
                'actualizar(...input).activo',

              description:
                'actualiza una clave booleana elegida dinámicamente',
            }),

            Object.freeze({
              input:
                Object.freeze([
                  Object.freeze({
                    nombre: 'Ada',
                    edad: 30,
                  }),
                  'nombre',
                  'Lin',
                ]),

              expected:
                'Lin',

              call:
                'actualizar(...input).nombre',

              description:
                'usa el valor de campo y no la clave literal campo',
            }),
          ]),

        pedagogicalRequirements:
          Object.freeze([]),

        oracle:
          null,
      }),
    ],

    [
      verifierKey(
        'js-objects-shared-reference-01',
        'step-4',
      ),

      Object.freeze({
        hiddenTestCases:
          Object.freeze([
            Object.freeze({
              input:
                Object.freeze([
                  Object.freeze({
                    perfil:
                      Object.freeze({
                        nombre: 'Ada',
                        ciudad: 'Madrid',
                      }),

                    activo: true,
                  }),
                  'Lin',
                ]),

              expected:
                'Lin|Ada|Madrid|true',

              call:
                "(() => { const original = input[0]; const copia = renombrar(original, input[1]); return copia.perfil.nombre + '|' + original.perfil.nombre + '|' + copia.perfil.ciudad + '|' + copia.activo; })()",

              description:
                'preserva propiedades del usuario y del perfil al copiar',
            }),

            Object.freeze({
              input:
                Object.freeze([
                  Object.freeze({
                    perfil:
                      Object.freeze({
                        nombre: 'Eva',
                      }),
                  }),
                  'Noa',
                ]),

              expected:
                false,

              call:
                '(() => { const original = input[0]; const copia = renombrar(original, input[1]); return copia === original || copia.perfil === original.perfil; })()',

              description:
                'crea objetos nuevos para usuario y perfil',
            }),
          ]),

        pedagogicalRequirements:
          Object.freeze([]),

        oracle:
          null,
      }),
    ],

    [
      verifierKey(
        'js-promises-await-value-01',
        'step-4',
      ),

      Object.freeze({
        hiddenTestCases:
          Object.freeze([
            Object.freeze({
              input:
                null,

              expected:
                'Hola Ada',

              call:
                'mensaje()',

              description:
                'resuelve el nombre antes de construir el mensaje',
            }),

            Object.freeze({
              input:
                null,

              expected:
                true,

              call:
                "mensaje() instanceof Promise",

              description:
                'mensaje mantiene un contrato asíncrono',
            }),
          ]),

        pedagogicalRequirements:
          Object.freeze([]),

        oracle:
          null,
      }),
    ],

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

        oracle:
          Object.freeze({
            outputCases:
              Object.freeze([
                Object.freeze({
                  input:
                    Object.freeze([
                      12,
                      -3,
                      5,
                      0,
                      12,
                    ]),

                  expected:
                    Object.freeze([
                      12,
                      5,
                      12,
                    ]),

                  call:
                    'positivos(input)',

                  description:
                    'oracle conductual: compara únicamente el output canónico',
                }),
              ]),
          }),
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
