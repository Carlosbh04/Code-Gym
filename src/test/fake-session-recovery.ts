import {
  SessionRecoveryError,
  type ISessionRecoveryStore,
  type SessionRecoveryErrorCode,
  type SessionRecoverySnapshot,
} from '@/lib/recovery/ISessionRecoveryStore';

/** Doble observable y controlable para los tests de useSession y SessionPage. */
export class FakeSessionRecoveryStore implements ISessionRecoveryStore {
  snapshot: SessionRecoverySnapshot | null = null;
  loadError: SessionRecoveryErrorCode | null = null;
  saveError: SessionRecoveryErrorCode | null = null;
  clearError: SessionRecoveryErrorCode | null = null;
  loadCalls = 0;
  clearCalls = 0;
  onClear: (() => void) | null = null;
  readonly saves: SessionRecoverySnapshot[] = [];

  load(): SessionRecoverySnapshot | null {
    this.loadCalls += 1;
    if (this.loadError !== null) throw this.error(this.loadError);
    return this.snapshot;
  }

  save(snapshot: SessionRecoverySnapshot): void {
    this.saves.push(snapshot);
    if (this.saveError !== null) throw this.error(this.saveError);
    this.snapshot = snapshot;
  }

  clear(): void {
    this.clearCalls += 1;
    this.onClear?.();
    if (this.clearError !== null) throw this.error(this.clearError);
    this.snapshot = null;
  }

  private error(code: SessionRecoveryErrorCode): SessionRecoveryError {
    return new SessionRecoveryError(code, `Error controlado: ${code}`);
  }
}
