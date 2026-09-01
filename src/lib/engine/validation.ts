import type { ExerciseStep } from '@/types/exercise';
import type { ValidationResult } from './types';

/**
 * Reglas de validación de los pasos de selección (§24).
 *
 * Lógica pura: sin React, sin DOM, sin almacenamiento y sin ejecutar código.
 * La ejecución del código del usuario es responsabilidad exclusiva del Worker
 * (D001) y entra en el engine con `validateFixCode` en T042.
 *
 * §24 asigna a cada tipo su referencia de comparación:
 *   code-reading    optionId contra la opción marcada como correcta
 *   predict-output  optionId contra la opción marcada como correcta
 *   find-error      tipo contra errorType
 *
 * Un paso mal formado no se valida a la ligera: se lanza, porque devolver
 * "incorrecto" ocultaría un fallo de contenido detrás de un resultado normal.
 */

/** Comprueba si `answer` es la opción correcta de un paso de opción múltiple. */
function matchesCorrectOption(step: ExerciseStep, answer: string): boolean {
  if (step.options === null) {
    throw new Error(
      `El paso ${step.id} es de tipo ${step.type} pero no declara opciones`,
    );
  }

  const correct = step.options.filter((option) => option.correct);
  if (correct.length === 0) {
    throw new Error(`El paso ${step.id} no declara ninguna opción correcta`);
  }

  return correct.some((option) => option.id === answer);
}

/** Comprueba si `answer` clasifica el error con el tipo que declara el paso. */
function matchesErrorType(step: ExerciseStep, answer: string): boolean {
  if (step.errorType === null) {
    throw new Error(`El paso ${step.id} es find-error pero no declara errorType`);
  }

  return step.errorType === answer;
}

/**
 * Valida la respuesta de un paso de selección.
 *
 * `answer` es el identificador elegido: el id de la opción en code-reading y
 * predict-output, y el tipo de error en find-error.
 *
 * NOTA sobre find-error: §24 describe su validación como "línea + tipo contra
 * errorLines + errorType", pero la firma que fija la misma sección solo recibe
 * un `string`. Aquí se valida el tipo, que es lo que esa cadena puede
 * transportar. La comprobación de `errorLines` necesita un segundo dato de
 * entrada, y esa es una decisión de contrato pendiente.
 */
export function validateSelection(
  step: ExerciseStep,
  answer: string,
): ValidationResult {
  if (step.type === 'fix-code') {
    throw new Error(
      `El paso ${step.id} es fix-code: su validación ejecuta código y corresponde al Worker, no a validateSelection`,
    );
  }

  const isCorrect =
    step.type === 'find-error'
      ? matchesErrorType(step, answer)
      : matchesCorrectOption(step, answer);

  return { isCorrect, explanation: step.explanation };
}
