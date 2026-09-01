import type { ExerciseStep, FindErrorAnswer, StepAnswer } from '@/types/exercise';
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
 *   find-error      línea + tipo contra errorLines + errorType
 *
 * Un paso mal formado no se valida a la ligera: se lanza, porque devolver
 * "incorrecto" ocultaría un fallo de contenido detrás de un resultado normal.
 * Por la misma razón se lanza cuando la respuesta no tiene la forma que el
 * tipo del paso exige: es un fallo de programación, no una respuesta errónea.
 */

/** Distingue la respuesta compuesta de find-error de un id de opción. */
export function isFindErrorAnswer(answer: StepAnswer): answer is FindErrorAnswer {
  return (
    typeof answer === 'object' &&
    answer !== null &&
    typeof answer.line === 'number' &&
    typeof answer.errorType === 'string'
  );
}

/** Comprueba si `answer` es la opción correcta de un paso de opción múltiple. */
function matchesCorrectOption(step: ExerciseStep, answer: StepAnswer): boolean {
  if (typeof answer !== 'string') {
    throw new Error(
      `El paso ${step.id} es de tipo ${step.type} y se responde con el id de una opción`,
    );
  }

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

/**
 * Comprueba la respuesta compuesta de un paso find-error (D014).
 *
 * Acierta solo quien señala una línea de `errorLines` **y** clasifica el error
 * con `errorType`. No hay crédito parcial: `ValidationResult.isCorrect` es
 * binario y §24 exige las dos comparaciones.
 *
 * `errorLines` es un array, así que un paso con varias líneas válidas se
 * resuelve señalando cualquiera de ellas sin cambiar esta regla.
 */
function matchesError(step: ExerciseStep, answer: StepAnswer): boolean {
  if (!isFindErrorAnswer(answer)) {
    throw new Error(
      `El paso ${step.id} es find-error y se responde con { line, errorType }`,
    );
  }

  if (step.errorLines === null || step.errorLines.length === 0) {
    throw new Error(`El paso ${step.id} es find-error pero no declara errorLines`);
  }

  if (step.errorType === null) {
    throw new Error(`El paso ${step.id} es find-error pero no declara errorType`);
  }

  return step.errorLines.includes(answer.line) && step.errorType === answer.errorType;
}

/**
 * Valida la respuesta de un paso de selección.
 *
 * `answer` toma la forma que fija el tipo del paso (D014): el id de la opción
 * elegida en code-reading y predict-output, y `{ line, errorType }` en
 * find-error.
 */
export function validateSelection(
  step: ExerciseStep,
  answer: StepAnswer,
): ValidationResult {
  if (step.type === 'fix-code') {
    throw new Error(
      `El paso ${step.id} es fix-code: su validación ejecuta código y corresponde al Worker, no a validateSelection`,
    );
  }

  const isCorrect =
    step.type === 'find-error'
      ? matchesError(step, answer)
      : matchesCorrectOption(step, answer);

  return { isCorrect, explanation: step.explanation };
}
