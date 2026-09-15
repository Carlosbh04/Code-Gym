/**
 * Tipos del ejecutor de código (§16 los sitúa en este fichero).
 *
 * El Master Plan nombra `ExecutionResult` en el flujo de §25 y en la firma de
 * §26, pero no declara su forma en ninguna sección. Se deriva de lo que el
 * propio plan describe, sin añadir nada:
 *
 * - El `worker-script` de §26 apila una entrada por test case con `input`,
 *   `expected`, `actual` y `pass`, y añade `error` cuando la ejecución de ese
 *   caso lanza. En el fallo fija `actual: null` y `pass: false`.
 * - §30 nombra `pass` y `results` como cosas distintas al describir los tests
 *   del executor: «código correcto → pass: true», «syntax error → results con
 *   error». De ahí que el resultado agregue un veredicto propio sobre la lista.
 *
 * Lo que NO lleva este tipo, también por el plan: el ciclo de vida de §26 dice
 * que el timeout y el error del worker **rechazan** la promesa
 * (`TIMEOUT → … → reject`, `ERROR → … → reject pending`). No son un resultado
 * con un campo de error, así que `ExecutionResult` no tiene dónde alojarlos.
 */

/**
 * Resultado de un test case concreto.
 *
 * Los valores viajan por `postMessage`, así que solo pueden ser cosas que el
 * algoritmo de clonado estructurado sepa copiar: `error` es el mensaje, no la
 * excepción, tal como lo construye el worker-script de §26.
 */
export interface TestCaseResult {
  input: unknown;
  expected: unknown;
  actual: unknown;
  pass: boolean;
  /** Mensaje del fallo de ese caso. Ausente cuando el caso se ejecutó bien. */
  error?: string;
}

/** Resultado de ejecutar el código del usuario contra todos sus test cases. */
export interface ExecutionResult {
  /** true solo si todos los casos pasan. */
  pass: boolean;
  results: TestCaseResult[];
}
