import type { UserAnswer } from './progress';

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

export type SessionAction =
  | { type: 'SUBMIT_ANSWER'; payload: UserAnswer }
  | { type: 'NEXT_STEP' }
  | { type: 'REVEAL_HINT'; payload: number }
  | { type: 'SET_VALIDATING'; payload: boolean }
  | { type: 'SET_COMPLETE' }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'RESTORE'; payload: Partial<SessionState> }
  | { type: 'RESET' };
