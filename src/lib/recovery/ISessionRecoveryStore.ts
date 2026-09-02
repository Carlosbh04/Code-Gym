import type { UserAnswer } from '@/types/progress';

/** Estado durable mínimo de una sesión activa (§21, D006, D012). */
export interface SessionRecoverySnapshot {
  sessionId: string;
  currentStep: number;
  answers: UserAnswer[];
  elapsedMs: number;
  hintsRevealed: number[];
  startTime: number;
}

export type SessionRecoveryErrorCode =
  | 'INVALID_JSON'
  | 'RECOVERY_FAILED'
  | 'STORAGE_UNAVAILABLE'
  | 'STORAGE_FULL';

/** Error clasificado que permite a la sesión aplicar la UI definida en §27. */
export class SessionRecoveryError extends Error {
  constructor(
    readonly code: SessionRecoveryErrorCode,
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'SessionRecoveryError';
  }
}

/**
 * Frontera síncrona del almacenamiento temporal de una sesión.
 *
 * El contrato no expone la tecnología, las claves ni la representación. El
 * hook solo conoce esta capacidad (D019).
 */
export interface ISessionRecoveryStore {
  load(): SessionRecoverySnapshot | null;
  save(snapshot: SessionRecoverySnapshot): void;
  clear(): void;
}
