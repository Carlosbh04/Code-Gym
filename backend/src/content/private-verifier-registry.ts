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
  createPrivateVerifierRegistry([
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
        'js-arrays-coding-transform-01',
        'step-1',
      ),

      Object.freeze({
        hiddenTestCases:
          Object.freeze([
            Object.freeze({
              input:
                Object.freeze([
                  80,
                  25,
                  0,
                ]),

              expected:
                Object.freeze([
                  72,
                  22.5,
                  0,
                ]),

              call:
                'aplicarDescuento(input)',

              description:
                'aplica el descuento a valores no publicados incluyendo cero',
            }),

            Object.freeze({
              input:
                Object.freeze([
                  40,
                  10,
                ]),

              expected:
                Object.freeze({
                  sameReference:
                    false,

                  inputUnchanged:
                    true,
                }),

              call:
                "(() => { const original = JSON.stringify(input); const resultado = aplicarDescuento(input); return { sameReference: resultado === input, inputUnchanged: JSON.stringify(input) === original }; })()",

              description:
                'crea un array nuevo sin modificar la entrada',
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
        'js-arrays-map-vs-foreach-01',
        'step-4',
      ),

      Object.freeze({
        hiddenTestCases:
          Object.freeze([
            Object.freeze({
              input:
                Object.freeze([
                  7,
                  -3,
                  2.5,
                ]),

              expected:
                Object.freeze([
                  14,
                  -6,
                  5,
                ]),

              call:
                'dobles(input)',

              description:
                'duplica valores arbitrarios incluyendo negativos y decimales',
            }),

            Object.freeze({
              input:
                Object.freeze([
                  4,
                  4,
                  1,
                ]),

              expected:
                Object.freeze([
                  8,
                  8,
                  2,
                ]),

              call:
                'dobles(input)',

              description:
                'conserva orden y duplicados sin depender de los ejemplos públicos',
            }),
          ]),

        pedagogicalRequirements:
          Object.freeze([
            Object.freeze({
              kind:
                'required-array-method',

              method:
                'map',

              feedback:
                'El resultado es correcto, pero este ejercicio requiere practicar Array.map() en lugar de Array.forEach().',
            }),
          ]),

        oracle:
          null,
      }),
    ],

    [
      verifierKey(
        'js-arrays-reduce-accumulator-01',
        'step-4',
      ),

      Object.freeze({
        hiddenTestCases:
          Object.freeze([
            Object.freeze({
              input:
                Object.freeze([
                  1.5,
                  -2.5,
                  10,
                ]),

              expected:
                9,

              call:
                'sumar(input)',

              description:
                'acumula decimales y negativos no publicados',
            }),

            Object.freeze({
              input:
                Object.freeze([
                  1,
                  2,
                  3,
                  4,
                  5,
                ]),

              expected:
                15,

              call:
                'sumar(input)',

              description:
                'suma una cantidad distinta de elementos',
            }),
          ]),

        pedagogicalRequirements:
          Object.freeze([
            Object.freeze({
              kind:
                'required-array-method',

              method:
                'reduce',

              feedback:
                'El resultado es correcto, pero este ejercicio requiere practicar Array.reduce() con valor inicial.',
            }),
          ]),

        oracle:
          null,
      }),
    ],

    [
      verifierKey(
        'js-closures-coding-counter-01',
        'step-1',
      ),

      Object.freeze({
        hiddenTestCases:
          Object.freeze([
            Object.freeze({
              input:
                null,

              expected:
                Object.freeze([
                  1,
                  2,
                  3,
                  4,
                  5,
                ]),

              call:
                '(() => { const contar = crearContador(); return [contar(), contar(), contar(), contar(), contar()]; })()',

              description:
                'mantiene el estado privado durante más llamadas',
            }),

            Object.freeze({
              input:
                null,

              expected:
                Object.freeze([
                  1,
                  2,
                  1,
                  3,
                  2,
                ]),

              call:
                '(() => { const a = crearContador(); const b = crearContador(); return [a(), a(), b(), a(), b()]; })()',

              description:
                'aísla el estado de contadores intercalados',
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
        'js-closures-live-binding-01',
        'step-4',
      ),

      Object.freeze({
        hiddenTestCases:
          Object.freeze([
            Object.freeze({
              input:
                null,

              expected:
                '12 GBP|12 GBP',

              call:
                "(() => { moneda = 'GBP'; const precio = crearPrecio(12); moneda = 'JPY'; return precio() + '|' + precio(); })()",

              description:
                'captura una moneda arbitraria sin escribirla a mano',
            }),

            Object.freeze({
              input:
                null,

              expected:
                '3 JPY|9 CHF',

              call:
                "(() => { moneda = 'JPY'; const primero = crearPrecio(3); moneda = 'CHF'; const segundo = crearPrecio(9); moneda = 'CAD'; return primero() + '|' + segundo(); })()",

              description:
                'cada closure conserva la moneda vigente al crearse',
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
        'js-functions-foundation-reference-execution-01',
        'step-4',
      ),

      behaviorOnly(
        Object.freeze({
          input:
            'Grace',

          expected:
            'Hola, Grace',

          call:
            'crearSaludo(input)',

          description:
            'saluda otro nombre no incluido en los casos públicos',
        }),

        Object.freeze({
          input:
            '',

          expected:
            'Hola, ',

          call:
            'crearSaludo(input)',

          description:
            'conserva una cadena vacía porque no es undefined',
        }),
      ),
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
        'js-functions-deepening-callbacks-01',
        'step-4',
      ),

      behaviorOnly(
        Object.freeze({
          input:
            7,

          expected:
            5,

          call:
            'aplicarOperacion(input, numero => numero - 2)',

          description:
            'ejecuta una transformación numérica diferente a las públicas',
        }),

        Object.freeze({
          input:
            'ab',

          expected:
            Object.freeze({
              resultado:
                'abab',
              llamadas:
                1,
            }),

          call:
            '(() => { let llamadas = 0; const resultado = aplicarOperacion(input, texto => { llamadas += 1; return texto.repeat(2); }); return { resultado, llamadas }; })()',

          description:
            'ejecuta exactamente una vez un callback alternativo',
        }),
      ),
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
        'js-functions-mastery-pipeline-effects-01',
        'step-4',
      ),

      behaviorOnly(
        Object.freeze({
          input:
            5,

          expected:
            Object.freeze({
              resultado:
                21,
              pasos:
                Object.freeze([
                  'primero:5',
                  'segundo:7',
                  'notificar:21',
                ]),
            }),

          call:
            "(() => { const pasos = []; const resultado = ejecutarPipeline(input, valor => { pasos.push('primero:' + valor); return valor + 2; }, valor => { pasos.push('segundo:' + valor); return valor * 3; }, valor => { pasos.push('notificar:' + valor); }); return { resultado, pasos }; })()",

          description:
            'preserva el orden y notifica una vez con el resultado final',
        }),

        Object.freeze({
          input:
            ' xy ',

          expected:
            Object.freeze({
              resultado:
                'XY!',
              notificados:
                Object.freeze([
                  'XY!',
                ]),
            }),

          call:
            '(() => { const notificados = []; const resultado = ejecutarPipeline(input, texto => texto.trim().toUpperCase(), texto => texto + "!", valor => notificados.push(valor)); return { resultado, notificados }; })()',

          description:
            'acepta composiciones de cadenas sin depender de una solución concreta',
        }),
      ),
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
        'js-closures-loop-capture-01',
        'step-4',
      ),

      Object.freeze({
        hiddenTestCases:
          Object.freeze([
            Object.freeze({
              input:
                null,

              expected:
                Object.freeze([
                  2,
                  0,
                  1,
                  2,
                ]),

              call:
                '(() => { const marcadores = crearMarcadores(); return [marcadores[2](), marcadores[0](), marcadores[1](), marcadores[2]()]; })()',

              description:
                'cada función conserva su binding aunque se invoquen fuera de orden',
            }),

            Object.freeze({
              input:
                null,

              expected:
                Object.freeze({
                  allFunctions:
                    true,

                  independentArrays:
                    true,

                  independentFunctions:
                    true,
                }),

              call:
                "(() => { const a = crearMarcadores(); const b = crearMarcadores(); return { allFunctions: a.every((item) => typeof item === 'function'), independentArrays: a !== b, independentFunctions: a.every((item, index) => item !== b[index]) }; })()",

              description:
                'cada fábrica produce una colección nueva de funciones',
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
        'js-closures-shared-state-01',
        'step-4',
      ),

      Object.freeze({
        hiddenTestCases:
          Object.freeze([
            Object.freeze({
              input:
                null,

              expected:
                Object.freeze([
                  1,
                  1,
                  2,
                  1,
                  2,
                  3,
                ]),

              call:
                '(() => { const a = crearRegistro(); const b = crearRegistro(); const c = crearRegistro(); return [a(), b(), a(), c(), b(), a()]; })()',

              description:
                'aísla tres estados aun cuando sus llamadas se intercalan',
            }),

            Object.freeze({
              input:
                null,

              expected:
                Object.freeze([
                  4,
                  1,
                ]),

              call:
                '(() => { const antiguo = crearRegistro(); antiguo(); antiguo(); antiguo(); const nuevo = crearRegistro(); return [antiguo(), nuevo()]; })()',

              description:
                'un registro tardío empieza desde cero sin reiniciar otro existente',
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
        'js-errors-finally-cleanup-01',
        'step-4',
      ),

      Object.freeze({
        hiddenTestCases:
          Object.freeze([
            Object.freeze({
              input:
                false,

              expected:
                Object.freeze({
                  bothClosed:
                    true,

                  distinctResources:
                    true,
                }),

              call:
                '(() => { const primero = ejecutar(input); const segundo = ejecutar(input); return { bothClosed: primero.cerrado && segundo.cerrado, distinctResources: primero !== segundo }; })()',

              description:
                'cada ejecución exitosa cierra su propio recurso',
            }),

            Object.freeze({
              input:
                true,

              expected:
                'Error|fallo',

              call:
                "(() => { try { ejecutar(input); return 'sin error'; } catch (error) { return error.name + '|' + error.message; } })()",

              description:
                'la limpieza no sustituye ni absorbe el error original',
            }),
          ]),

        /*
         * El contrato observable permite estrategias equivalentes
         * a `finally`; el prompt no obliga a escribir esa palabra.
         */
        pedagogicalRequirements:
          Object.freeze([]),

        oracle:
          null,
      }),
    ],

    [
      verifierKey(
        'js-functions-return-flow-01',
        'step-4',
      ),

      Object.freeze({
        hiddenTestCases:
          Object.freeze([
            Object.freeze({
              input:
                Object.freeze({
                  nombre:
                    'Lin',

                  email:
                    '',
                }),

              expected:
                Object.freeze([
                  'falta el email',
                ]),

              call:
                'validar(input)',

              description:
                'detecta un email vacío con un nombre distinto a los ejemplos',
            }),

            Object.freeze({
              input:
                Object.freeze({
                  nombre:
                    false,

                  email:
                    0,
                }),

              expected:
                Object.freeze([
                  'falta el nombre',
                  'falta el email',
                ]),

              call:
                'validar(input)',

              description:
                'acumula ambos errores para valores ausentes representados por falsy',
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
        'js-functions-scope-hoisting-01',
        'step-4',
      ),

      Object.freeze({
        hiddenTestCases:
          Object.freeze([
            Object.freeze({
              input:
                100.5,

              expected:
                'avanzado',

              call:
                'nivel(input)',

              description:
                'clasifica un decimal por encima del umbral',
            }),

            Object.freeze({
              input:
                99.999,

              expected:
                'inicial',

              call:
                'nivel(input)',

              description:
                'clasifica un decimal justo por debajo del umbral',
            }),

            Object.freeze({
              input:
                -10,

              expected:
                'inicial',

              call:
                'nivel(input)',

              description:
                'clasifica valores negativos sin depender de los ejemplos públicos',
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
        'js-variables-deepening-shadowing-01',
        'step-4',
      ),

      behaviorOnly(
        Object.freeze({
          input:
            '  Grace Hopper  ',
          expected:
            'Grace Hopper',
          call:
            'normalizarNombre(input)',
          description:
            'normaliza un nombre no publicado con espacio interior',
        }),
        Object.freeze({
          input:
            '   ',
          expected:
            'sin nombre',
          call:
            'normalizarNombre(input)',
          description:
            'trata una cadena formada por espacios como nombre vacío',
        }),
      ),
    ],

    [
      verifierKey(
        'js-variables-deepening-const-values-01',
        'step-4',
      ),

      behaviorOnly(
        Object.freeze({
          input:
            Object.freeze([
              Object.freeze({
                etiquetas:
                  Object.freeze([
                    'backend',
                  ]),
              }),
              'testing',
            ]),
          expected:
            Object.freeze({
              values:
                Object.freeze([
                  'backend',
                  'testing',
                ]),
              sameProfile:
                true,
              sameList:
                true,
            }),
          call:
            '(() => { const perfil = input[0]; const lista = perfil.etiquetas; const resultado = agregarEtiqueta(perfil, input[1]); return { values: resultado.etiquetas, sameProfile: resultado === perfil, sameList: resultado.etiquetas === lista }; })()',
          description:
            'mantiene ambas referencias con otros valores',
        }),
        Object.freeze({
          input:
            Object.freeze([
              Object.freeze({
                etiquetas:
                  Object.freeze([
                    'x',
                    'y',
                  ]),
              }),
              'x',
            ]),
          expected:
            Object.freeze([
              'x',
              'y',
              'x',
            ]),
          call:
            'agregarEtiqueta(input[0], input[1]).etiquetas',
          description:
            'añade sin deduplicar ni sustituir la lista',
        }),
      ),
    ],

    [
      verifierKey(
        'js-variables-deepening-tdz-coercion-01',
        'step-4',
      ),

      behaviorOnly(
        Object.freeze({
          input:
            Object.freeze([
              '7',
              1.5,
            ]),
          expected:
            10.5,
          call:
            'calcularTotal(...input)',
          description:
            'convierte una cantidad no publicada con precio decimal',
        }),
        Object.freeze({
          input:
            Object.freeze([
              '-2',
              4,
            ]),
          expected:
            -8,
          call:
            'calcularTotal(...input)',
          description:
            'conserva el signo durante la conversión',
        }),
      ),
    ],

    [
      verifierKey(
        'js-variables-deepening-checkpoint-01',
        'step-4',
      ),

      behaviorOnly(
        Object.freeze({
          input:
            Object.freeze([
              '100.5',
              '-0.5',
            ]),
          expected:
            100,
          call:
            'aplicarMovimiento(...input)',
          description:
            'combina saldos y movimientos decimales',
        }),
        Object.freeze({
          input:
            Object.freeze([
              '-8',
              '3.5',
            ]),
          expected:
            -4.5,
          call:
            'aplicarMovimiento(...input)',
          description:
            'actualiza un saldo negativo sin hardcode',
        }),
      ),
    ],

    [
      verifierKey(
        'js-variables-mastery-nested-scopes-01',
        'step-4',
      ),

      behaviorOnly(
        Object.freeze({
          input:
            Object.freeze([
              1,
              Object.freeze([
                2,
                3,
                4,
              ]),
            ]),
          expected:
            10,
          call:
            'aplicarAjustes(...input)',
          description:
            'acumula más ajustes que los ejemplos públicos',
        }),
        Object.freeze({
          input:
            Object.freeze([
              2.5,
              Object.freeze([
                -1.5,
                0,
                3,
              ]),
            ]),
          expected:
            4,
          call:
            'aplicarAjustes(...input)',
          description:
            'combina decimales, cero y negativos',
        }),
      ),
    ],

    [
      verifierKey(
        'js-variables-mastery-aliasing-01',
        'step-4',
      ),

      behaviorOnly(
        Object.freeze({
          input:
            Object.freeze([
              Object.freeze({
                tema:
                  'noche',
                contador:
                  0,
                avisos:
                  false,
              }),
              'día',
            ]),
          expected:
            Object.freeze({
              nextTheme:
                'día',
              originalTheme:
                'noche',
              counter:
                0,
              notifications:
                false,
              different:
                true,
            }),
          call:
            '(() => { const original = input[0]; const resultado = actualizarPreferencia(original, input[1]); return { nextTheme: resultado.tema, originalTheme: original.tema, counter: resultado.contador, notifications: resultado.avisos, different: resultado !== original }; })()',
          description:
            'preserva propiedades falsy y la entrada original',
        }),
        Object.freeze({
          input:
            Object.freeze([
              Object.freeze({
                tema:
                  'rojo',
                idioma:
                  'ca',
              }),
              'azul',
            ]),
          expected:
            Object.freeze({
              tema:
                'azul',
              idioma:
                'ca',
            }),
          call:
            'actualizarPreferencia(input[0], input[1])',
          description:
            'conserva otra propiedad no publicada',
        }),
      ),
    ],

    [
      verifierKey(
        'js-variables-mastery-state-tracing-01',
        'step-4',
      ),

      behaviorOnly(
        Object.freeze({
          input:
            Object.freeze([
              '5',
              Object.freeze([
                2,
                '-3',
                0.5,
              ]),
            ]),
          expected:
            Object.freeze({
              inicial:
                5,
              final:
                4.5,
              diferencia:
                -0.5,
            }),
          call:
            'resumirCambios(...input)',
          description:
            'sigue cambios mixtos y decimales',
        }),
        Object.freeze({
          input:
            Object.freeze([
              100,
              Object.freeze([
                -25,
                -25,
              ]),
            ]),
          expected:
            Object.freeze({
              inicial:
                100,
              final:
                50,
              diferencia:
                -50,
            }),
          call:
            'resumirCambios(...input)',
          description:
            'no confunde el estado inicial con el final',
        }),
      ),
    ],

    [
      verifierKey(
        'js-variables-mastery-checkpoint-01',
        'step-4',
      ),

      behaviorOnly(
        Object.freeze({
          input:
            Object.freeze([
              0,
              '0',
              false,
            ]),
          expected:
            Object.freeze({
              inicial:
                0,
              actual:
                0,
              diferencia:
                0,
              bloqueado:
                false,
            }),
          call:
            'construirResultado(...input)',
          description:
            'conserva ceros explícitos sin activar defaults',
        }),
        Object.freeze({
          input:
            Object.freeze([
              1.5,
              '2.5',
              false,
            ]),
          expected:
            Object.freeze({
              inicial:
                1.5,
              actual:
                4,
              diferencia:
                2.5,
              bloqueado:
                false,
            }),
          call:
            'construirResultado(...input)',
          description:
            'aplica un cambio decimal no publicado',
        }),
        Object.freeze({
          input:
            Object.freeze([
              9,
              '100',
              true,
            ]),
          expected:
            Object.freeze({
              inicial:
                9,
              actual:
                9,
              diferencia:
                0,
              bloqueado:
                true,
            }),
          call:
            'construirResultado(...input)',
          description:
            'ignora un cambio distinto cuando está bloqueado',
        }),
      ),
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

    [
      verifierKey(
        'js-closures-deepening-shared-environment-01',
        'step-4',
      ),

      behaviorOnly(
        Object.freeze({
          input: null,
          expected: '16|4',
          call:
            "(() => { const m = crearMarcador(10); m.sumar(8); m.restar(2); const primero = m.leer(); m.restar(12); return primero + '|' + m.leer(); })()",
          description:
            'coordina varias operaciones sobre el mismo estado privado',
        }),

        Object.freeze({
          input: null,
          expected: '9|-11|50',
          call:
            "(() => { const a = crearMarcador(4); const b = crearMarcador(-5); const c = crearMarcador(50); a.sumar(10); a.restar(5); b.restar(6); return a.leer() + '|' + b.leer() + '|' + c.leer(); })()",
          description:
            'mantiene tres instancias independientes',
        }),
      ),
    ],

    [
      verifierKey(
        'js-es6-deepening-nested-destructuring-01',
        'step-4',
      ),

      behaviorOnly(
        Object.freeze({
          input:
            Object.freeze({
              perfil:
                Object.freeze({
                  nombre:
                    'Eva',
                  contacto:
                    Object.freeze({
                      email:
                        'eva@demo.test',
                    }),
                }),
            }),
          expected:
            'Eva|eva@demo.test',
          call:
            'leerContacto(input)',
          description:
            'resuelve un contacto anidado completo',
        }),

        Object.freeze({
          input:
            Object.freeze({
              perfil:
                Object.freeze({}),
            }),
          expected:
            'Sin nombre|sin-email',
          call:
            'leerContacto(input)',
          description:
            'aplica defaults cuando faltan propiedades interiores',
        }),
      ),
    ],

    [
      verifierKey(
        'js-es6-deepening-object-rest-01',
        'step-4',
      ),

      behaviorOnly(
        Object.freeze({
          input:
            Object.freeze({
              id:
                11,
              nombre:
                'Luis',
              password:
                'secret',
              token:
                'token',
              activo:
                true,
            }),
          expected:
            Object.freeze({
              id:
                11,
              nombre:
                'Luis',
              activo:
                true,
            }),
          call:
            'quitarCredenciales(input)',
          description:
            'elimina password y token conservando el resto',
        }),

        Object.freeze({
          input:
            Object.freeze({
              id:
                12,
              nombre:
                '',
              activo:
                false,
              puntos:
                0,
            }),
          expected:
            Object.freeze({
              id:
                12,
              nombre:
                '',
              activo:
                false,
              puntos:
                0,
            }),
          call:
            'quitarCredenciales(input)',
          description:
            'preserva valores falsy no sensibles',
        }),
      ),
    ],

    [
      verifierKey(
        'js-es6-deepening-safe-access-01',
        'step-4',
      ),

      behaviorOnly(
        Object.freeze({
          input:
            Object.freeze({
              usuario:
                Object.freeze({
                  preferencias:
                    Object.freeze({
                      tema:
                        false,
                    }),
                }),
            }),
          expected:
            false,
          call:
            'temaActivo(input)',
          description:
            'conserva false porque no es nullish',
        }),

        Object.freeze({
          input:
            Object.freeze({
              usuario:
                Object.freeze({}),
            }),
          expected:
            'claro',
          call:
            'temaActivo(input)',
          description:
            'tolera preferencias ausentes',
        }),
      ),
    ],

    [
      verifierKey(
        'js-es6-deepening-checkpoint-01',
        'step-4',
      ),

      behaviorOnly(
        Object.freeze({
          input:
            Object.freeze({
              perfil:
                Object.freeze({
                  nombre:
                    'Nora',
                  direccion:
                    Object.freeze({}),
                }),
              activo:
                false,
            }),
          expected:
            Object.freeze({
              nombre:
                'Nora',
              ciudad:
                'Sin ciudad',
              activo:
                false,
            }),
          call:
            'crearResumen(input)',
          description:
            'conserva false y aplica fallback solo a ciudad',
        }),

        Object.freeze({
          input:
            Object.freeze({
              activo:
                0,
            }),
          expected:
            Object.freeze({
              nombre:
                'Sin nombre',
              ciudad:
                'Sin ciudad',
              activo:
                0,
            }),
          call:
            'crearResumen(input)',
          description:
            'conserva cero como valor definido',
        }),
      ),
    ],

    [
      verifierKey(
        'js-es6-mastery-immutable-update-01',
        'step-4',
      ),

      behaviorOnly(
        Object.freeze({
          input:
            Object.freeze({
              estado:
                Object.freeze({
                  preferencias:
                    Object.freeze({
                      tema:
                        'claro',
                      idioma:
                        'es',
                      sonido:
                        true,
                    }),
                  perfil:
                    Object.freeze({
                      nombre:
                        'Mario',
                    }),
                }),
              clave:
                'idioma',
              valor:
                'fr',
            }),
          expected:
            Object.freeze({
              preferencias:
                Object.freeze({
                  tema:
                    'claro',
                  idioma:
                    'fr',
                  sonido:
                    true,
                }),
              perfil:
                Object.freeze({
                  nombre:
                    'Mario',
                }),
            }),
          call:
            'actualizarPreferencia(input.estado, input.clave, input.valor)',
          description:
            'actualiza una única preferencia preservando las demás',
        }),

        Object.freeze({
          input:
            Object.freeze({
              estado:
                Object.freeze({
                  preferencias:
                    Object.freeze({
                      contador:
                        4,
                    }),
                  activo:
                    false,
                }),
              clave:
                'contador',
              valor:
                0,
            }),
          expected:
            Object.freeze({
              preferencias:
                Object.freeze({
                  contador:
                    0,
                }),
              activo:
                false,
            }),
          call:
            'actualizarPreferencia(input.estado, input.clave, input.valor)',
          description:
            'acepta cero como nuevo valor',
        }),
      ),
    ],

    [
      verifierKey(
        'js-es6-mastery-normalize-profile-01',
        'step-4',
      ),

      behaviorOnly(
        Object.freeze({
          input:
            Object.freeze({
              nombre:
                null,
              email:
                undefined,
              puntos:
                10,
            }),
          expected:
            Object.freeze({
              nombre:
                'Sin nombre',
              email:
                'sin-email',
              puntos:
                10,
            }),
          call:
            'normalizarPerfil(input)',
          description:
            'normaliza null y undefined conservando extras',
        }),

        Object.freeze({
          input:
            Object.freeze({
              nombre:
                false,
              email:
                0,
              activo:
                false,
            }),
          expected:
            Object.freeze({
              nombre:
                false,
              email:
                0,
              activo:
                false,
            }),
          call:
            'normalizarPerfil(input)',
          description:
            'conserva valores definidos aunque sean falsy',
        }),
      ),
    ],

    [
      verifierKey(
        'js-es6-mastery-config-composition-01',
        'step-4',
      ),

      behaviorOnly(
        Object.freeze({
          input:
            Object.freeze({
              base:
                Object.freeze({
                  tema:
                    'claro',
                  limites:
                    Object.freeze({
                      min:
                        1,
                      max:
                        100,
                    }),
                  activo:
                    false,
                }),
              cambios:
                Object.freeze({
                  limites:
                    Object.freeze({
                      max:
                        50,
                    }),
                }),
            }),
          expected:
            Object.freeze({
              tema:
                'claro',
              limites:
                Object.freeze({
                  min:
                    1,
                  max:
                    50,
                }),
              activo:
                false,
            }),
          call:
            'combinarConfig(input.base, input.cambios)',
          description:
            'fusiona parcialmente la rama limites',
        }),

        Object.freeze({
          input:
            Object.freeze({
              base:
                Object.freeze({
                  limites:
                    Object.freeze({
                      min:
                        0,
                      max:
                        0,
                    }),
                  modo:
                    'base',
                }),
              cambios:
                Object.freeze({
                  limites:
                    Object.freeze({
                      min:
                        -5,
                    }),
                  modo:
                    '',
                }),
            }),
          expected:
            Object.freeze({
              limites:
                Object.freeze({
                  min:
                    -5,
                  max:
                    0,
                }),
              modo:
                '',
            }),
          call:
            'combinarConfig(input.base, input.cambios)',
          description:
            'respeta precedencia y valores falsy',
        }),
      ),
    ],

    [
      verifierKey(
        'js-es6-mastery-checkpoint-01',
        'step-4',
      ),

      behaviorOnly(
        Object.freeze({
          input:
            Object.freeze({
              id:
                20,
              nombre:
                null,
              perfil:
                Object.freeze({
                  direccion:
                    Object.freeze({
                      ciudad:
                        '',
                    }),
                  preferencias:
                    Object.freeze({
                      tema:
                        false,
                    }),
                }),
              puntos:
                0,
            }),
          expected:
            Object.freeze({
              id:
                20,
              nombre:
                'Anónimo',
              ciudad:
                '',
              tema:
                false,
              extras:
                Object.freeze({
                  puntos:
                    0,
                }),
            }),
          call:
            'prepararVista(input)',
          description:
            'normaliza null sin perder falsy válidos ni extras',
        }),

        Object.freeze({
          input:
            Object.freeze({
              id:
                21,
              perfil:
                null,
              activo:
                false,
            }),
          expected:
            Object.freeze({
              id:
                21,
              nombre:
                'Anónimo',
              ciudad:
                'Sin ciudad',
              tema:
                'claro',
              extras:
                Object.freeze({
                  activo:
                    false,
                }),
            }),
          call:
            'prepararVista(input)',
          description:
            'tolera perfil null y conserva propiedades extra',
        }),
      ),
    ],

    [
      verifierKey(
        'js-closures-deepening-configured-factory-01',
        'step-4',
      ),

      behaviorOnly(
        Object.freeze({
          input: null,
          expected: '17.5|-8',
          call:
            "(() => { const mitad = crearConversor(0.5); const negativo = crearConversor(-2); return mitad(35) + '|' + negativo(4); })()",
          description:
            'conserva factores alternativos',
        }),

        Object.freeze({
          input: null,
          expected: '6|15|8',
          call:
            "(() => { const doble = crearConversor(2); const triple = crearConversor(3); const otroDoble = crearConversor(2); return doble(3) + '|' + triple(5) + '|' + otroDoble(4); })()",
          description:
            'no contamina otras fábricas',
        }),
      ),
    ],

    [
      verifierKey(
        'js-closures-deepening-captured-dependency-01',
        'step-4',
      ),

      behaviorOnly(
        Object.freeze({
          input: null,
          expected: 'hola!|16',
          call:
            "(() => { const texto = crearProcesador(valor => valor + '!'); const cuadrado = crearProcesador(valor => valor * valor); return texto('hola') + '|' + cuadrado(4); })()",
          description:
            'conserva estrategias de tipos distintos',
        }),

        Object.freeze({
          input: null,
          expected:
            Object.freeze({
              resultado: 15,
              llamadas: 2,
            }),
          call:
            "(() => { let llamadas = 0; const procesar = crearProcesador(valor => { llamadas += 1; return valor + 5; }); const primero = procesar(3); const segundo = procesar(10); return { resultado: primero + segundo - 8, llamadas }; })()",
          description:
            'reutiliza exactamente la dependencia capturada',
        }),
      ),
    ],

    [
      verifierKey(
        'js-closures-deepening-checkpoint-01',
        'step-4',
      ),

      behaviorOnly(
        Object.freeze({
          input: null,
          expected: '3|2|c|y',
          call:
            "(() => { const a = crearHistorial(); const b = crearHistorial(); a.agregar('a'); a.agregar('b'); a.agregar('c'); b.agregar('x'); b.agregar('y'); return a.cantidad() + '|' + b.cantidad() + '|' + a.ultimo() + '|' + b.ultimo(); })()",
          description:
            'mantiene cantidad y último elemento por instancia',
        }),

        Object.freeze({
          input: null,
          expected: '0|1|0',
          call:
            "(() => { const vacio = crearHistorial(); const usado = crearHistorial(); usado.agregar('uno'); const nuevo = crearHistorial(); return vacio.cantidad() + '|' + usado.cantidad() + '|' + nuevo.cantidad(); })()",
          description:
            'cada historial nuevo comienza vacío',
        }),
      ),
    ],

    [
      verifierKey(
        'js-closures-mastery-encapsulated-api-01',
        'step-4',
      ),

      behaviorOnly(
        Object.freeze({
          input: null,
          expected: 'false|true|false',
          call:
            "(() => { const s = crearSesion(); s.cerrar(); const uno = s.estado(); s.abrir(); const dos = s.estado(); s.cerrar(); return uno + '|' + dos + '|' + s.estado(); })()",
          description:
            'coordina transiciones sobre estado encapsulado',
        }),

        Object.freeze({
          input: null,
          expected: 'true|false|true',
          call:
            "(() => { const a = crearSesion(); const b = crearSesion(); const c = crearSesion(); b.cerrar(); return a.estado() + '|' + b.estado() + '|' + c.estado(); })()",
          description:
            'mantiene sesiones independientes',
        }),
      ),
    ],

    [
      verifierKey(
        'js-closures-mastery-dependency-isolation-01',
        'step-4',
      ),

      behaviorOnly(
        Object.freeze({
          input: null,
          expected: 'X:a|X:b|Y:c',
          call:
            "(() => { const uno = []; const dos = []; const logX = crearLogger(valor => uno.push(valor), 'X:'); const logY = crearLogger(valor => dos.push(valor), 'Y:'); logX('a'); logX('b'); logY('c'); return uno.join('|') + '|' + dos.join('|'); })()",
          description:
            'separa destinos y prefijos',
        }),

        Object.freeze({
          input: null,
          expected:
            Object.freeze({
              a: 2,
              b: 1,
            }),
          call:
            "(() => { let a = 0; let b = 0; const logA = crearLogger(() => { a += 1; }, 'A:'); const logB = crearLogger(() => { b += 1; }, 'B:'); logA('x'); logB('y'); logA('z'); return { a, b }; })()",
          description:
            'mantiene callbacks independientes',
        }),
      ),
    ],

    [
      verifierKey(
        'js-closures-mastery-live-reference-01',
        'step-4',
      ),

      behaviorOnly(
        Object.freeze({
          input: null,
          expected: 'inicial',
          call:
            "(() => { const config = { modo: 'inicial' }; const leer = crearLector(config); config.modo = 'cambiado'; config.extra = true; return leer(); })()",
          description:
            'conserva el snapshot tras mutaciones posteriores',
        }),

        Object.freeze({
          input: null,
          expected: 'A|B|C',
          call:
            "(() => { const a = { modo: 'A' }; const b = { modo: 'B' }; const c = { modo: 'C' }; const leerA = crearLector(a); const leerB = crearLector(b); const leerC = crearLector(c); a.modo = 'X'; b.modo = 'Y'; c.modo = 'Z'; return leerA() + '|' + leerB() + '|' + leerC(); })()",
          description:
            'mantiene snapshots de varias instancias',
        }),
      ),
    ],

    [
      verifierKey(
        'js-closures-mastery-checkpoint-01',
        'step-4',
      ),

      behaviorOnly(
        Object.freeze({
          input: null,
          expected: '0|3',
          call:
            "(() => { const a = crearReserva(2); const b = crearReserva(3); a.reservar(); a.reservar(); a.reservar(); b.reservar(); b.liberar(); return a.leer() + '|' + b.leer(); })()",
          description:
            'respeta límite inferior y aislamiento',
        }),

        Object.freeze({
          input: null,
          expected: '4|0|1',
          call:
            "(() => { const grande = crearReserva(1); grande.liberar(); grande.liberar(); grande.liberar(); const cero = crearReserva(0); cero.reservar(); const otra = crearReserva(1); return grande.leer() + '|' + cero.leer() + '|' + otra.leer(); })()",
          description:
            'maneja capacidad cero y liberaciones',
        }),
      ),
    ],
    [
      verifierKey(
        'js-objects-deepening-nested-copy-01',
        'step-4',
      ),

      Object.freeze({
        hiddenTestCases:
          Object.freeze([
            Object.freeze({
              input:
                Object.freeze([
                  Object.freeze({
                    nombre: 'Eva',
                    perfil:
                      Object.freeze({
                        ciudad: 'Lisboa',
                        idioma: 'pt',
                        activo: false,
                      }),
                    rol: 'editor',
                  }),
                  'Porto',
                ]),

              expected:
                'Porto|Lisboa|pt|editor',

              call:
                "(() => { const original = input[0]; const copia = actualizarCiudad(original, input[1]); return copia.perfil.ciudad + '|' + original.perfil.ciudad + '|' + copia.perfil.idioma + '|' + copia.rol; })()",

              description:
                'copia la rama perfil conservando propiedades arbitrarias',
            }),

            Object.freeze({
              input:
                Object.freeze([
                  Object.freeze({
                    perfil:
                      Object.freeze({
                        ciudad: 'A',
                        puntos: 0,
                      }),
                  }),
                  'B',
                ]),

              expected:
                'false|false|0',

              call:
                "(() => { const original = input[0]; const copia = actualizarCiudad(original, input[1]); return (copia === original) + '|' + (copia.perfil === original.perfil) + '|' + copia.perfil.puntos; })()",

              description:
                'crea objetos independientes y conserva valores falsy',
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
        'js-objects-deepening-entry-transform-01',
        'step-4',
      ),

      Object.freeze({
        hiddenTestCases:
          Object.freeze([
            Object.freeze({
              input:
                Object.freeze({
                  cero: 0,
                  falso: false,
                  vacio: '',
                  nulo: null,
                  texto: 'ok',
                }),

              expected:
                '{"cero":0,"falso":false,"vacio":"","texto":"ok"}',

              call:
                'JSON.stringify(limpiarNulos(input))',

              description:
                'elimina solo null conservando valores falsy válidos',
            }),

            Object.freeze({
              input:
                Object.freeze({
                  a: 1,
                  b: 2,
                  c: 3,
                }),

              expected:
                '1|2|3|false',

              call:
                "(() => { const original = input; const copia = limpiarNulos(original); return copia.a + '|' + copia.b + '|' + copia.c + '|' + (copia === original); })()",

              description:
                'devuelve un objeto nuevo incluso cuando no elimina propiedades',
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
        'js-objects-deepening-merge-precedence-01',
        'step-4',
      ),

      Object.freeze({
        hiddenTestCases:
          Object.freeze([
            Object.freeze({
              input:
                Object.freeze([
                  Object.freeze({
                    a: 1,
                    b: 2,
                    c: 3,
                  }),
                  Object.freeze({
                    b: 20,
                    d: 4,
                  }),
                ]),

              expected:
                '1|20|3|4',

              call:
                "(() => { const r = combinarConfig(...input); return r.a + '|' + r.b + '|' + r.c + '|' + r.d; })()",

              description:
                'aplica precedencia sin perder propiedades no sobrescritas',
            }),

            Object.freeze({
              input:
                Object.freeze([
                  Object.freeze({
                    activo: true,
                    limite: 0,
                  }),
                  Object.freeze({
                    activo: false,
                  }),
                ]),

              expected:
                'false|0|true|false',

              call:
                "(() => { const base = input[0]; const cambios = input[1]; const r = combinarConfig(base, cambios); return r.activo + '|' + r.limite + '|' + base.activo + '|' + (r === base); })()",

              description:
                'respeta false como sobrescritura sin mutar base',
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
        'js-objects-deepening-checkpoint-01',
        'step-4',
      ),

      Object.freeze({
        hiddenTestCases:
          Object.freeze([
            Object.freeze({
              input:
                Object.freeze([
                  Object.freeze({
                    cero: 0,
                    falso: false,
                    vacio: '',
                    nulo: null,
                  }),
                  Object.freeze([
                    'cero',
                    'falso',
                    'vacio',
                    'faltante',
                  ]),
                ]),

              expected:
                '{"cero":0,"falso":false,"vacio":""}',

              call:
                'JSON.stringify(seleccionarPropias(...input))',

              description:
                'distingue existencia de truthiness',
            }),

            Object.freeze({
              input:
                Object.freeze([
                  Object.freeze({
                    id: 9,
                    nombre: 'Ada',
                  }),
                  Object.freeze([
                    'nombre',
                    'id',
                  ]),
                ]),

              expected:
                'Ada|9|false',

              call:
                "(() => { const original = input[0]; const r = seleccionarPropias(...input); return r.nombre + '|' + r.id + '|' + (r === original); })()",

              description:
                'selecciona claves en orden arbitrario y devuelve otro objeto',
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
        'js-objects-mastery-aliasing-01',
        'step-4',
      ),

      Object.freeze({
        hiddenTestCases:
          Object.freeze([
            Object.freeze({
              input:
                null,

              expected:
                'Noa|Eva|Eva|true',

              call:
                "(() => { const perfil = { nombre: 'Eva', activo: true }; const estado = { principal: perfil, respaldo: perfil }; const r = actualizarPrincipal(estado, 'Noa'); return r.principal.nombre + '|' + r.respaldo.nombre + '|' + estado.principal.nombre + '|' + r.principal.activo; })()",

              description:
                'separa principal conservando respaldo y propiedades arbitrarias',
            }),

            Object.freeze({
              input:
                null,

              expected:
                'false|false|true',

              call:
                "(() => { const perfil = { nombre: 'A' }; const estado = { principal: perfil, respaldo: perfil }; const r = actualizarPrincipal(estado, 'B'); return (r === estado) + '|' + (r.principal === estado.principal) + '|' + (r.respaldo === estado.respaldo); })()",

              description:
                'crea contenedor y principal nuevos manteniendo la rama respaldo',
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
        'js-objects-mastery-normalize-01',
        'step-4',
      ),

      Object.freeze({
        hiddenTestCases:
          Object.freeze([
            Object.freeze({
              input:
                Object.freeze({
                  nombre: '  EVA  ',
                  email: 'Eva@Test.COM',
                  puntos: 0,
                  activo: false,
                }),

              expected:
                'EVA|eva@test.com|0|false',

              call:
                "(() => { const r = normalizarUsuario(input); return r.nombre + '|' + r.email + '|' + r.puntos + '|' + r.activo; })()",

              description:
                'normaliza campos conservando valores falsy y propiedades extra',
            }),

            Object.freeze({
              input:
                Object.freeze({
                  nombre: ' Lin ',
                  email: 'LIN@X.IO',
                  rol: 'admin',
                }),

              expected:
                ' Lin |LIN@X.IO|false|admin',

              call:
                "(() => { const original = input; const r = normalizarUsuario(original); return original.nombre + '|' + original.email + '|' + (r === original) + '|' + r.rol; })()",

              description:
                'no muta el objeto recibido y devuelve otra referencia',
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
        'js-objects-mastery-nested-config-01',
        'step-4',
      ),

      Object.freeze({
        hiddenTestCases:
          Object.freeze([
            Object.freeze({
              input:
                Object.freeze([
                  Object.freeze({
                    tema: 'claro',
                    limites:
                      Object.freeze({
                        min: 1,
                        max: 10,
                        paso: 2,
                      }),
                  }),
                  Object.freeze({
                    tema: 'oscuro',
                    limites:
                      Object.freeze({
                        max: 30,
                      }),
                  }),
                ]),

              expected:
                'oscuro|1|30|2',

              call:
                "(() => { const r = combinarConfigProfunda(...input); return r.tema + '|' + r.limites.min + '|' + r.limites.max + '|' + r.limites.paso; })()",

              description:
                'combina nivel superior y rama limites preservando propiedades',
            }),

            Object.freeze({
              input:
                Object.freeze([
                  Object.freeze({
                    limites:
                      Object.freeze({
                        min: 0,
                        max: 9,
                      }),
                  }),
                  Object.freeze({
                    limites:
                      Object.freeze({
                        min: 5,
                      }),
                  }),
                ]),

              expected:
                '0|9|5|9|false|false',

              call:
                "(() => { const base = input[0]; const r = combinarConfigProfunda(...input); return base.limites.min + '|' + base.limites.max + '|' + r.limites.min + '|' + r.limites.max + '|' + (r === base) + '|' + (r.limites === base.limites); })()",

              description:
                'no muta base y crea una rama limites independiente',
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
        'js-objects-mastery-checkpoint-01',
        'step-4',
      ),

      Object.freeze({
        hiddenTestCases:
          Object.freeze([
            Object.freeze({
              input:
                Object.freeze([
                  Object.freeze({
                    id: 4,
                    preferencias:
                      Object.freeze({
                        tema: 'claro',
                        idioma: 'es',
                        volumen: 10,
                      }),
                  }),
                  'volumen',
                  0,
                ]),

              expected:
                '0|10|es|4',

              call:
                "(() => { const estado = input[0]; const r = actualizarPreferencia(...input); return r.preferencias.volumen + '|' + estado.preferencias.volumen + '|' + r.preferencias.idioma + '|' + r.id; })()",

              description:
                'actualiza una clave dinámica con valor cero sin mutar la entrada',
            }),

            Object.freeze({
              input:
                Object.freeze([
                  Object.freeze({
                    preferencias:
                      Object.freeze({
                        tema: 'claro',
                      }),
                    sesion:
                      Object.freeze({
                        activa: true,
                      }),
                  }),
                  'avisos',
                  false,
                ]),

              expected:
                'false|undefined|true|false|false',

              call:
                "(() => { const estado = input[0]; const r = actualizarPreferencia(...input); return r.preferencias.avisos + '|' + estado.preferencias.avisos + '|' + r.sesion.activa + '|' + (r === estado) + '|' + (r.preferencias === estado.preferencias); })()",

              description:
                'añade una propiedad falsy preservando ramas ajenas',
            }),
          ]),

        pedagogicalRequirements:
          Object.freeze([]),

        oracle:
          null,
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

function behaviorOnly(
  ...hiddenTestCases:
    readonly VerifierTestCase[]
): PrivateVerifierConfig {
  return Object.freeze({
    hiddenTestCases:
      Object.freeze([
        ...hiddenTestCases,
      ]),
    pedagogicalRequirements:
      Object.freeze([]),
    oracle:
      null,
  });
}

function createPrivateVerifierRegistry(
  entries:
    readonly (
      readonly [
        string,
        PrivateVerifierConfig,
      ]
    )[],
): ReadonlyMap<
  string,
  PrivateVerifierConfig
> {
  const result =
    new Map<
      string,
      PrivateVerifierConfig
    >();

  for (
    const [
      key,
      config,
    ]
    of entries
  ) {
    if (result.has(key)) {
      throw new Error(
        `Private verifier duplicado: ${key}`,
      );
    }

    result.set(
      key,
      config,
    );
  }

  return result;
}
