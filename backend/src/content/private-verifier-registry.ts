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
