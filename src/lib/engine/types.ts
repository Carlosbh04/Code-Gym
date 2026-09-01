/**
 * Tipos propios del engine (§16 los sitúa en este fichero).
 *
 * `ValidationResult` es el tipo de retorno que §24 asigna a `validateSelection`
 * y a `validateFixCode`, pero el Master Plan no define su forma en ninguna
 * sección. Se declara aquí con lo mínimo que §7 exige mostrar tras responder:
 * si la respuesta es correcta y la explicación del paso.
 *
 * Cuando T042 añada `validateFixCode`, este tipo podrá necesitar los resultados
 * de los test cases; ampliarlo entonces no rompe a los consumidores actuales.
 */
export interface ValidationResult {
  isCorrect: boolean;
  explanation: string;
}
