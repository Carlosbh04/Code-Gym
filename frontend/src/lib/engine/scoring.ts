import type { ExerciseSession } from '@/types/exercise';
import type { DomainImpact, SessionScore, UserAnswer } from '@/types/progress';

/**
 * Puntuación de una sesión completada (§24).
 *
 * Función pura: no lee ni escribe estado, no toca React, DOM, almacenamiento,
 * red ni Worker, y no muta la sesión ni las respuestas que recibe.
 *
 * `domainImpact` llega como parámetro en lugar de calcularse aquí. §22 sitúa
 * ese cálculo en `lib/progress/domain-calculator.ts`, que crea T025; inyectarlo
 * mantiene el scoring como aritmética pura y evita que esta tarea adelante otra.
 * T050 es donde ambos se juntan.
 *
 * `hintsUsed` se acumula como dato informativo. §6 dice que cada pista revelada
 * reduce la puntuación del paso, pero ni §24 define esa penalización ni
 * `SessionScore` tiene un campo de puntuación por paso donde aplicarla, así que
 * aquí no se inventa ninguna curva de descuento.
 */
export function calculateScore(
  session: ExerciseSession,
  answers: UserAnswer[],
  domainImpact: DomainImpact,
): SessionScore {
  const totalSteps = session.steps.length;
  const correctSteps = answers.filter((answer) => answer.isCorrect).length;

  // Una sesión sin pasos no es un 100 %: es una sesión sin nada que puntuar.
  const accuracy = totalSteps === 0 ? 0 : (correctSteps / totalSteps) * 100;

  const timeSpentMs = answers.reduce((total, answer) => total + answer.timeSpentMs, 0);
  const hintsUsed = answers.reduce((total, answer) => total + answer.hintsUsed, 0);

  return {
    totalSteps,
    correctSteps,
    accuracy,
    timeSpentMs,
    hintsUsed,
    domainImpact,
  };
}
