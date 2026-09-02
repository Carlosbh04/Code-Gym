import { createContext } from 'react';
import type { ExerciseSession } from '@/types/exercise';
import type { SessionScore, UserAnswer } from '@/types/progress';

/**
 * Fachada estrecha de finalización de sesión (T050, D018).
 *
 * El identificador de operación distingue dos ejecuciones legítimas de la
 * misma sesión y permite reanudar, durante este montaje, un plan que falló.
 */
export interface SessionCompletionContextValue {
  completeSession: (
    operationId: string,
    session: ExerciseSession,
    answers: UserAnswer[],
  ) => Promise<SessionScore>;
}

export const SessionCompletionContext =
  createContext<SessionCompletionContextValue | null>(null);
