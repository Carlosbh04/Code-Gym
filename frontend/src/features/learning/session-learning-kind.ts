import type {
  ExerciseSession,
  ExerciseSessionKind,
} from '@/types/exercise';

export function getSessionLearningKind(
  session: ExerciseSession,
): ExerciseSessionKind {
  return session.kind
    ?? 'practice';
}

export function isSessionAvailableForStage(
  session: ExerciseSession,
  stageStatus:
    'locked'
    | 'available'
    | 'completed',
): boolean {
  if (
    session.requiredForProgression
    === false
  ) {
    return true;
  }

  return stageStatus
    !== 'locked';
}

// SESSION_ENTRY_CANONICAL_GATE_MODEL
export function canEnterLearningSession(
  session: ExerciseSession,
  levelState:
    | import('./learning-types').LearningLevelState
    | undefined,
): boolean {
  /*
   * Ausencia de levelId es el contrato legacy.
   * No obligamos al contenido antiguo a participar
   * en la progresión pedagógica staged.
   */
  if (
    session.levelId
    === undefined
  ) {
    return true;
  }

  /*
   * Staged siempre falla cerrado mientras el
   * backend todavía no ha confirmado su estado.
   */
  if (
    levelState
    === undefined
  ) {
    return false;
  }

  /*
   * También rechazamos respuestas que no
   * correspondan realmente a esta sesión.
   */
  if (
    levelState.conceptId
      !== session.conceptId
    || levelState.levelId
      !== session.levelId
  ) {
    return false;
  }

  /*
   * locked cubre tanto:
   * - previous-concept-incomplete
   * - previous-level-incomplete
   */
  if (
    levelState.locked
  ) {
    return false;
  }

  const kind =
    getSessionLearningKind(
      session,
    );

  return isSessionAvailableForStage(
    session,
    levelState.stages[
      kind
    ].status,
  );
}
