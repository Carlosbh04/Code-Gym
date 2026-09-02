import type { CompletedSession } from '@/types/progress';
import type { ICompletedSessionRepository } from './ICompletedSessionRepository';

/** Clave privada de almacenamiento definida por §20 y §29. */
const COMPLETED_SESSIONS_STORAGE_KEY = 'codegym:completed-sessions';

function parseCompletedSessions(serialized: string): CompletedSession[] {
  try {
    const parsed: unknown = JSON.parse(serialized);
    return Array.isArray(parsed) ? (parsed as CompletedSession[]) : [];
  } catch {
    return [];
  }
}

/**
 * Metadata local de sesiones completadas detrás de
 * `ICompletedSessionRepository` (§20, §23).
 *
 * La colección contiene una sola entrada por `sessionId`. `save` reemplaza la
 * anterior porque representa el resultado más reciente de esa sesión, mientras
 * que `getRecent` ordena todas las sesiones por `completedAt` descendente.
 * Clave, JSON y acceso a `localStorage` quedan encapsulados en esta clase
 * conforme a D002.
 *
 * Ausencia de datos, JSON inválido o una raíz que no sea un array equivalen a
 * colección vacía; una escritura válida posterior sustituye la corrupción.
 * Los fallos reales de `Storage` se propagan sin convertirlos en datos válidos.
 */
export class LocalCompletedSessionRepository
  implements ICompletedSessionRepository
{
  constructor(private readonly storage: Storage = localStorage) {}

  async save(session: CompletedSession): Promise<void> {
    const withoutPrevious = this.readAll().filter(
      (stored) => stored.sessionId !== session.sessionId,
    );

    this.storage.setItem(
      COMPLETED_SESSIONS_STORAGE_KEY,
      JSON.stringify([...withoutPrevious, session]),
    );
  }

  async getBySessionId(sessionId: string): Promise<CompletedSession | null> {
    return this.readAll().find((session) => session.sessionId === sessionId) ?? null;
  }

  async getRecent(limit: number): Promise<CompletedSession[]> {
    if (limit <= 0 || Number.isNaN(limit)) {
      return [];
    }

    return this.readAll()
      .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
      .slice(0, Math.floor(limit));
  }

  async clear(): Promise<void> {
    this.storage.removeItem(COMPLETED_SESSIONS_STORAGE_KEY);
  }

  private readAll(): CompletedSession[] {
    const serialized = this.storage.getItem(COMPLETED_SESSIONS_STORAGE_KEY);
    return serialized === null ? [] : parseCompletedSessions(serialized);
  }
}
