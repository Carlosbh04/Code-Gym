import type { StepAnswer, StepType } from '@/types/exercise';
import type { UserAnswer } from '@/types/progress';
import {
  SessionRecoveryError,
  type ISessionRecoveryStore,
  type SessionRecoverySnapshot,
} from './ISessionRecoveryStore';

export const SESSION_RECOVERY_KEY = 'codegym:session';

const STEP_TYPES = new Set<StepType>([
  'code-reading',
  'predict-output',
  'find-error',
  'fix-code',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonNegativeFinite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && isNonNegativeFinite(value);
}

function isStepAnswer(value: unknown): value is StepAnswer {
  if (typeof value === 'string') return true;
  if (typeof value === 'number') return Number.isFinite(value);

  return (
    isRecord(value) &&
    isNonNegativeInteger(value.line) &&
    value.line > 0 &&
    typeof value.errorType === 'string' &&
    value.errorType.length > 0
  );
}

function isUserAnswer(value: unknown): value is UserAnswer {
  return (
    isRecord(value) &&
    typeof value.stepId === 'string' &&
    value.stepId.length > 0 &&
    typeof value.stepType === 'string' &&
    STEP_TYPES.has(value.stepType as StepType) &&
    isStepAnswer(value.answer) &&
    typeof value.isCorrect === 'boolean' &&
    isNonNegativeFinite(value.timeSpentMs) &&
    isNonNegativeInteger(value.hintsUsed)
  );
}

function normalizeSnapshot(value: unknown): SessionRecoverySnapshot {
  if (!isRecord(value)) {
    throw new SessionRecoveryError(
      'RECOVERY_FAILED',
      'El recovery no es un objeto válido',
    );
  }

  const {
    sessionId,
    currentStep,
    answers,
    elapsedMs,
    hintsRevealed,
    startTime,
  } = value;

  const validHints =
    Array.isArray(hintsRevealed) &&
    hintsRevealed.every(isNonNegativeInteger) &&
    new Set(hintsRevealed).size === hintsRevealed.length;
  const validAnswers = Array.isArray(answers) && answers.every(isUserAnswer);
  const validPosition =
    validAnswers &&
    isNonNegativeInteger(currentStep) &&
    (answers.length === currentStep || answers.length === currentStep + 1);

  if (
    typeof sessionId !== 'string' ||
    sessionId.length === 0 ||
    !validPosition ||
    !isNonNegativeFinite(elapsedMs) ||
    !validHints ||
    !isNonNegativeFinite(startTime)
  ) {
    throw new SessionRecoveryError(
      'RECOVERY_FAILED',
      'La estructura del recovery no permite una restauración segura',
    );
  }

  return {
    sessionId,
    currentStep,
    answers,
    elapsedMs,
    hintsRevealed,
    startTime,
  };
}

function isStorageFull(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    (error.name === 'QuotaExceededError' ||
      error.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      error.code === 22 ||
      error.code === 1014)
  );
}

function storageError(error: unknown, canBeFull = false): SessionRecoveryError {
  if (error instanceof SessionRecoveryError) return error;

  const code = canBeFull && isStorageFull(error)
    ? 'STORAGE_FULL'
    : 'STORAGE_UNAVAILABLE';

  return new SessionRecoveryError(
    code,
    code === 'STORAGE_FULL'
      ? 'No hay espacio para guardar la sesión activa'
      : 'El almacenamiento temporal no está disponible',
    error,
  );
}

/** Persistencia temporal de la sesión activa mediante sessionStorage (D006). */
export class SessionStorageRecoveryStore implements ISessionRecoveryStore {
  constructor(private readonly injectedStorage?: Storage) {}

  private storage(): Storage {
    // La propia lectura de la propiedad global puede lanzar SecurityError en
    // algunos modos de privacidad; se resuelve dentro de cada try/catch.
    return this.injectedStorage ?? sessionStorage;
  }

  load(): SessionRecoverySnapshot | null {
    let raw: string | null;

    try {
      raw = this.storage().getItem(SESSION_RECOVERY_KEY);
    } catch (error: unknown) {
      throw storageError(error);
    }

    if (raw === null) return null;

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (error: unknown) {
      throw new SessionRecoveryError(
        'INVALID_JSON',
        'El recovery contiene JSON inválido',
        error,
      );
    }

    return normalizeSnapshot(parsed);
  }

  save(snapshot: SessionRecoverySnapshot): void {
    const normalized = normalizeSnapshot(snapshot);

    try {
      this.storage().setItem(SESSION_RECOVERY_KEY, JSON.stringify(normalized));
    } catch (error: unknown) {
      throw storageError(error, true);
    }
  }

  clear(): void {
    try {
      this.storage().removeItem(SESSION_RECOVERY_KEY);
    } catch (error: unknown) {
      throw storageError(error);
    }
  }
}
