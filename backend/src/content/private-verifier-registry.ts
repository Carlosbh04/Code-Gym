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
        'js-variables-basics-01',
        'step-4',
      ),

      Object.freeze({
        hiddenTestCases:
          Object.freeze([
            Object.freeze({
              input:
                -3,

              expected:
                -2,

              call:
                'incrementarContador(input)',

              description:
                'incrementa también valores negativos',
            }),

            Object.freeze({
              input:
                41,

              expected:
                42,

              call:
                'incrementarContador(input)',

              description:
                'no depende de los valores públicos conocidos',
            }),

            Object.freeze({
              input:
                1.5,

              expected:
                2.5,

              call:
                'incrementarContador(input)',

              description:
                'respeta el comportamiento con valores decimales',
            }),
          ]),

        /*
         * Este ejercicio evalúa comportamiento.
         *
         * No exigimos literalmente `let`, `const` ni una forma
         * concreta de implementación. Una solución como
         * `return inicial + 1` también es correcta.
         */
        pedagogicalRequirements:
          Object.freeze([]),

        oracle:
          null,
      }),
    ],

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
        'js-objects-coding-pick-01',
        'step-1',
      ),

      Object.freeze({
        hiddenTestCases:
          Object.freeze([
            Object.freeze({
              input:
                Object.freeze([
                  Object.freeze({
                    id: 7,
                    nombre: 'Ada',
                    activo: false,
                    rol: 'admin',
                  }),
                  Object.freeze([
                    'id',
                    'rol',
                  ]),
                ]),

              expected:
                Object.freeze({
                  id: 7,
                  rol: 'admin',
                }),

              call:
                'seleccionar(...input)',

              description:
                'selecciona claves arbitrarias distintas a los ejemplos públicos',
            }),

            Object.freeze({
              input:
                Object.freeze([
                  Object.freeze({
                    a: 1,
                    b: 2,
                  }),
                  Object.freeze([
                    'b',
                    'z',
                  ]),
                ]),

              expected:
                Object.freeze({
                  b: 2,
                }),

              call:
                'seleccionar(...input)',

              description:
                'omite claves inexistentes sin alterar las existentes',
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
        'js-objects-object-entries-01',
        'step-4',
      ),

      Object.freeze({
        hiddenTestCases:
          Object.freeze([
            Object.freeze({
              input:
                Object.freeze({
                  uno: 10,
                  dos: -3,
                  tres: 0,
                  cuatro: 5,
                }),

              expected:
                12,

              call:
                'sumar(input)',

              description:
                'suma valores arbitrarios incluyendo negativos y cero',
            }),

            Object.freeze({
              input:
                Object.freeze({
                  x: 1,
                  y: 2,
                  z: 3,
                  w: 4,
                }),

              expected:
                10,

              call:
                'sumar(input)',

              description:
                'suma más de dos propiedades sin depender de nombres concretos',
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
        'js-promises-chain-transform-01',
        'step-4',
      ),

      Object.freeze({
        hiddenTestCases:
          Object.freeze([
            Object.freeze({
              input:
                7,

              expected:
                14,

              call:
                'duplicar(input)',

              description:
                'duplica otro valor mediante la cadena asíncrona',
            }),

            Object.freeze({
              input:
                5,

              expected:
                true,

              call:
                'duplicar(input) instanceof Promise',

              description:
                'devuelve una Promise al llamador',
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
        'js-promises-coding-fetch-label-01',
        'step-1',
      ),

      Object.freeze({
        hiddenTestCases:
          Object.freeze([
            Object.freeze({
              input:
                Object.freeze({
                  nombre: 'Noa',
                }),

              expected:
                'Hola, Noa',

              call:
                'etiquetaUsuario(Promise.resolve(input))',

              description:
                'usa dinámicamente el nombre de otro usuario',
            }),

            Object.freeze({
              input:
                Object.freeze({
                  nombre: 'Eva',
                }),

              expected:
                true,

              call:
                'etiquetaUsuario(Promise.resolve(input)) instanceof Promise',

              description:
                'mantiene un contrato asíncrono',
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
        'js-promises-error-recovery-01',
        'step-4',
      ),

      Object.freeze({
        hiddenTestCases:
          Object.freeze([
            Object.freeze({
              input:
                true,

              expected:
                true,

              call:
                'cargar(input) instanceof Promise',

              description:
                'la rama remota devuelve una Promise',
            }),

            Object.freeze({
              input:
                false,

              expected:
                true,

              call:
                'cargar(input) instanceof Promise',

              description:
                'la rama de rechazo devuelve una Promise',
            }),

            Object.freeze({
              input:
                false,

              expected:
                'Error',

              call:
                "cargar(input).then(() => 'sin error').catch((error) => error.name)",

              description:
                'el rechazo sigue disponible para el caller',
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
        'js-objects-coding-pick-01',
        'step-1',
      ),

      Object.freeze({
        hiddenTestCases:
          Object.freeze([
            Object.freeze({
              input:
                Object.freeze([
                  Object.freeze({
                    id: 7,
                    nombre: 'Ada',
                    activo: false,
                    rol: 'admin',
                  }),
                  Object.freeze([
                    'id',
                    'rol',
                  ]),
                ]),

              expected:
                Object.freeze({
                  id: 7,
                  rol: 'admin',
                }),

              call:
                'seleccionar(...input)',

              description:
                'selecciona claves arbitrarias distintas a los ejemplos públicos',
            }),

            Object.freeze({
              input:
                Object.freeze([
                  Object.freeze({
                    a: 1,
                    b: 2,
                  }),
                  Object.freeze([
                    'b',
                    'z',
                  ]),
                ]),

              expected:
                Object.freeze({
                  b: 2,
                }),

              call:
                'seleccionar(...input)',

              description:
                'omite claves inexistentes sin alterar las existentes',
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
        'js-objects-object-entries-01',
        'step-4',
      ),

      Object.freeze({
        hiddenTestCases:
          Object.freeze([
            Object.freeze({
              input:
                Object.freeze({
                  uno: 10,
                  dos: -3,
                  tres: 0,
                  cuatro: 5,
                }),

              expected:
                12,

              call:
                'sumar(input)',

              description:
                'suma valores arbitrarios incluyendo negativos y cero',
            }),

            Object.freeze({
              input:
                Object.freeze({
                  x: 1,
                  y: 2,
                  z: 3,
                  w: 4,
                }),

              expected:
                10,

              call:
                'sumar(input)',

              description:
                'suma más de dos propiedades sin depender de nombres concretos',
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
        'js-promises-chain-transform-01',
        'step-4',
      ),

      Object.freeze({
        hiddenTestCases:
          Object.freeze([
            Object.freeze({
              input:
                7,

              expected:
                14,

              call:
                'duplicar(input)',

              description:
                'duplica otro valor mediante la cadena asíncrona',
            }),

            Object.freeze({
              input:
                5,

              expected:
                true,

              call:
                'duplicar(input) instanceof Promise',

              description:
                'devuelve una Promise al llamador',
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
        'js-promises-coding-fetch-label-01',
        'step-1',
      ),

      Object.freeze({
        hiddenTestCases:
          Object.freeze([
            Object.freeze({
              input:
                Object.freeze({
                  nombre: 'Noa',
                }),

              expected:
                'Hola, Noa',

              call:
                'etiquetaUsuario(Promise.resolve(input))',

              description:
                'usa dinámicamente el nombre de otro usuario',
            }),

            Object.freeze({
              input:
                Object.freeze({
                  nombre: 'Eva',
                }),

              expected:
                true,

              call:
                'etiquetaUsuario(Promise.resolve(input)) instanceof Promise',

              description:
                'mantiene un contrato asíncrono',
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
        'js-promises-error-recovery-01',
        'step-4',
      ),

      Object.freeze({
        hiddenTestCases:
          Object.freeze([
            Object.freeze({
              input:
                true,

              expected:
                true,

              call:
                'cargar(input) instanceof Promise',

              description:
                'la rama remota devuelve una Promise',
            }),

            Object.freeze({
              input:
                false,

              expected:
                true,

              call:
                'cargar(input) instanceof Promise',

              description:
                'la rama de rechazo devuelve una Promise',
            }),

            Object.freeze({
              input:
                false,

              expected:
                'Error',

              call:
                "cargar(input).then(() => 'sin error').catch((error) => error.name)",

              description:
                'el rechazo sigue disponible para el caller',
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
        'js-errors-catch-context-01',
        'step-4',
      ),

      Object.freeze({
        hiddenTestCases:
          Object.freeze([
            Object.freeze({
              input:
                '{"nombre":"Ada","activo":false}',

              expected:
                'Ada|false',

              call:
                "(() => { const value = analizar(input); return value.nombre + '|' + value.activo; })()",

              description:
                'conserva datos de otro JSON válido',
            }),

            Object.freeze({
              input:
                '{"nombre": }',

              expected:
                'Error',

              call:
                "(() => { try { analizar(input); return 'sin error'; } catch (error) { return error.name; } })()",

              description:
                'propaga otro JSON malformado como Error',
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
        'js-errors-coding-parse-number-01',
        'step-1',
      ),

      Object.freeze({
        hiddenTestCases:
          Object.freeze([
            Object.freeze({
              input:
                '-3.5',

              expected:
                -3.5,

              call:
                'leerNumero(input)',

              description:
                'convierte correctamente un decimal negativo finito',
            }),

            Object.freeze({
              input:
                'Infinity',

              expected:
                'Número inválido',

              call:
                "(() => { try { leerNumero(input); return 'sin error'; } catch (error) { return error.message; } })()",

              description:
                'rechaza valores numéricos no finitos',
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
        'js-errors-throw-validation-01',
        'step-4',
      ),

      Object.freeze({
        hiddenTestCases:
          Object.freeze([
            Object.freeze({
              input:
                -6,

              expected:
                -12,

              call:
                'duplicar(input)',

              description:
                'acepta otro número válido',
            }),

            Object.freeze({
              input:
                false,

              expected:
                'TypeError',

              call:
                "(() => { try { duplicar(input); return 'sin error'; } catch (error) { return error.name; } })()",

              description:
                'rechaza booleanos con TypeError',
            }),

            Object.freeze({
              input:
                null,

              expected:
                'TypeError',

              call:
                "(() => { try { duplicar(input); return 'sin error'; } catch (error) { return error.name; } })()",

              description:
                'rechaza null con TypeError',
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
        'js-functions-coding-format-name-01',
        'step-1',
      ),

      Object.freeze({
        hiddenTestCases:
          Object.freeze([
            Object.freeze({
              input:
                Object.freeze([
                  '  Grace',
                  'Hopper  ',
                ]),

              expected:
                'Grace Hopper',

              call:
                'nombreCompleto(...input)',

              description:
                'limpia espacios externos con otros nombres',
            }),

            Object.freeze({
              input:
                Object.freeze([
                  'Lin',
                  'Torvalds',
                ]),

              expected:
                'Lin Torvalds',

              call:
                'nombreCompleto(...input)',

              description:
                'une otros valores sin depender del ejemplo público',
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
        'js-functions-deepening-checkpoint-01',
        'step-1',
      ),

      Object.freeze({
        hiddenTestCases:
          Object.freeze([
            Object.freeze({
              input:
                100,

              expected:
                'avanzado',

              call:
                'clasificar(input)',

              description:
                'clasifica correctamente el límite avanzado',
            }),

            Object.freeze({
              input:
                99,

              expected:
                'inicial',

              call:
                'clasificar(input)',

              description:
                'clasifica correctamente justo debajo del límite',
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
        'js-functions-foundation-checkpoint-01',
        'step-1',
      ),

      Object.freeze({
        hiddenTestCases:
          Object.freeze([
            Object.freeze({
              input:
                Object.freeze([
                  35,
                  7,
                ]),

              expected:
                42,

              call:
                'calcular(...input)',

              description:
                'suma otros valores explícitos',
            }),

            Object.freeze({
              input:
                Object.freeze([
                  25,
                  0,
                ]),

              expected:
                25,

              call:
                'calcular(...input)',

              description:
                'conserva impuesto cero explícito',
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
        'js-functions-mastery-checkpoint-01',
        'step-1',
      ),

      Object.freeze({
        hiddenTestCases:
          Object.freeze([
            Object.freeze({
              input:
                Object.freeze([
                  '',
                  25,
                ]),

              expected:
                Object.freeze({
                  nombre: '',
                  edad: 25,
                }),

              call:
                'crearPerfil(...input)',

              description:
                'conserva un nombre vacío porque no es undefined',
            }),

            Object.freeze({
              input:
                null,

              expected:
                Object.freeze({
                  nombre: 'Invitado',
                  edad: 40,
                }),

              call:
                'crearPerfil(undefined, 40)',

              description:
                'aplica el default de nombre solo cuando falta',
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
        'js-functions-mastery-consistent-return-01',
        'step-1',
      ),

      Object.freeze({
        hiddenTestCases:
          Object.freeze([
            Object.freeze({
              input:
                Object.freeze([
                  Object.freeze([
                    Object.freeze({
                      id: 1,
                      nombre: 'Ana',
                    }),
                    Object.freeze({
                      id: 2,
                      nombre: 'Lin',
                    }),
                  ]),
                  2,
                ]),

              expected:
                Object.freeze({
                  id: 2,
                  nombre: 'Lin',
                }),

              call:
                'buscarUsuario(...input)',

              description:
                'encuentra una coincidencia fuera de la primera posición',
            }),

            Object.freeze({
              input:
                Object.freeze([
                  Object.freeze([
                    Object.freeze({
                      id: 1,
                      nombre: 'Ana',
                    }),
                  ]),
                  9,
                ]),

              expected:
                null,

              call:
                'buscarUsuario(...input)',

              description:
                'devuelve null cuando falta el id en un array no vacío',
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
        'js-functions-mastery-contracts-01',
        'step-1',
      ),

      Object.freeze({
        hiddenTestCases:
          Object.freeze([
            Object.freeze({
              input:
                Object.freeze([
                  5,
                  false,
                ]),

              expected:
                Object.freeze({
                  reintentos: 5,
                  silencioso: false,
                }),

              call:
                'configurar(...input)',

              description:
                'conserva false junto a un número no cero',
            }),

            Object.freeze({
              input:
                Object.freeze([
                  0,
                  true,
                ]),

              expected:
                Object.freeze({
                  reintentos: 0,
                  silencioso: true,
                }),

              call:
                'configurar(...input)',

              description:
                'conserva cero junto a true',
            }),

            Object.freeze({
              input:
                null,

              expected:
                Object.freeze({
                  reintentos: 3,
                  silencioso: false,
                }),

              call:
                'configurar(undefined, false)',

              description:
                'aplica default solo al argumento realmente ausente',
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
        'js-es6-coding-unique-tags-01',
        'step-1',
      ),

      Object.freeze({
        hiddenTestCases:
          Object.freeze([
            Object.freeze({
              input:
                Object.freeze([
                  'web',
                  'api',
                  'web',
                  'docs',
                  'api',
                  'cli',
                ]),

              expected:
                Object.freeze([
                  'web',
                  'api',
                  'docs',
                  'cli',
                ]),

              call:
                'etiquetasUnicas(input)',

              description:
                'elimina múltiples duplicados conservando el primer orden',
            }),

            Object.freeze({
              input:
                Object.freeze([
                  'uno',
                  'uno',
                  'uno',
                  'dos',
                ]),

              expected:
                Object.freeze([
                  'uno',
                  'dos',
                ]),

              call:
                'etiquetasUnicas(input)',

              description:
                'colapsa repeticiones consecutivas y conserva valores distintos',
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
        'js-es6-destructuring-shapes-01',
        'step-4',
      ),

      Object.freeze({
        hiddenTestCases:
          Object.freeze([
            Object.freeze({
              input:
                Object.freeze([
                  -8,
                  3,
                ]),

              expected:
                -5,

              call:
                'sumarCoordenadas(input)',

              description:
                'suma coordenadas negativas y positivas',
            }),

            Object.freeze({
              input:
                Object.freeze([
                  1.5,
                  2.5,
                ]),

              expected:
                4,

              call:
                'sumarCoordenadas(input)',

              description:
                'suma coordenadas decimales',
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
        'js-es6-rest-arguments-01',
        'step-4',
      ),

      Object.freeze({
        hiddenTestCases:
          Object.freeze([
            Object.freeze({
              input:
                Object.freeze([
                  7,
                ]),

              expected:
                7,

              call:
                'sumarTodos(...input)',

              description:
                'acepta un solo argumento',
            }),

            Object.freeze({
              input:
                Object.freeze([
                  -4,
                  1,
                  3,
                  10,
                ]),

              expected:
                10,

              call:
                'sumarTodos(...input)',

              description:
                'acepta una cantidad distinta de argumentos y números negativos',
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
        'js-es6-nullish-defaults-01',
        'step-4',
      ),

      Object.freeze({
        hiddenTestCases:
          Object.freeze([
            Object.freeze({
              input:
                false,

              expected:
                false,

              call:
                'etiqueta(input)',

              description:
                'conserva false porque no es nullish',
            }),

            Object.freeze({
              input:
                0,

              expected:
                0,

              call:
                'etiqueta(input)',

              description:
                'conserva cero porque no es nullish',
            }),

            Object.freeze({
              input:
                null,

              expected:
                'sin etiqueta',

              call:
                'etiqueta(undefined)',

              description:
                'usa fallback también cuando el valor es undefined',
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
        'js-functions-default-parameters-01',
        'step-4',
      ),

      Object.freeze({
        hiddenTestCases:
          Object.freeze([
            Object.freeze({
              input:
                null,

              expected:
                Object.freeze({
                  producto: 'mesa',
                  cantidad: 1,
                }),

              call:
                "crearPedido('mesa', undefined)",

              description:
                'usa el valor por defecto cuando cantidad es undefined',
            }),

            Object.freeze({
              input:
                Object.freeze([
                  'silla',
                  7,
                ]),

              expected:
                Object.freeze({
                  producto: 'silla',
                  cantidad: 7,
                }),

              call:
                'crearPedido(...input)',

              description:
                'conserva otra cantidad explícita',
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
