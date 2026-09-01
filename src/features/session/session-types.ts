import type { UserAnswer } from '@/types/progress';

export interface SessionState {
  sessionId: string;
  currentStep: number;
  answers: UserAnswer[];
  startTime: number;
  elapsedMs: number;
  hintsRevealed: number[];
  isValidating: boolean;
  isComplete: boolean;
  error: string | null;
}

/**
 * Las dos mitades de la respuesta de un paso find-error mientras se elige
 * (D014). Ninguna está puesta hasta que el usuario la elige; solo cuando las
 * dos lo están hay un `FindErrorAnswer` que enviar al engine.
 */
export interface FindErrorSelection {
  line: number | null;
  errorType: string | null;
}

export type SessionAction =
  | { type: 'SUBMIT_ANSWER'; payload: UserAnswer }
  | { type: 'NEXT_STEP' }
  | { type: 'REVEAL_HINT'; payload: number }
  | { type: 'SET_VALIDATING'; payload: boolean }
  | { type: 'SET_COMPLETE' }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'RESTORE'; payload: Partial<SessionState> }
  | { type: 'RESET' };
