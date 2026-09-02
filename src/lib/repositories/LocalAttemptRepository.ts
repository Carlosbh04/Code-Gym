import type { Attempt } from '@/types/progress';
import type { IAttemptRepository } from './IAttemptRepository';

/** Clave privada de almacenamiento definida por §20 y §29. */
const ATTEMPTS_STORAGE_KEY = 'codegym:attempts';

function parseAttempts(serialized: string): Attempt[] {
  try {
    const parsed: unknown = JSON.parse(serialized);
    return Array.isArray(parsed) ? (parsed as Attempt[]) : [];
  } catch {
    return [];
  }
}

/**
 * Historial local de respuestas detrás de `IAttemptRepository` (§20, §23).
 *
 * Los intentos son eventos: cada `saveAttempt` añade uno y no existe una
 * operación de actualización en el contrato. La representación, la clave y el
 * acceso a `localStorage` quedan encerrados aquí para que los consumidores no
 * dependan de infraestructura y una futura implementación remota pueda usar el
 * mismo contrato (D002).
 *
 * Ausencia de datos, JSON inválido o una raíz que no sea un array equivalen a
 * historial vacío. Una escritura posterior sustituye esos datos corruptos.
 * Los fallos reales de `Storage` se propagan para no presentarlos como datos
 * válidos y permitir que una capa posterior aplique la estrategia de §27.
 */
export class LocalAttemptRepository implements IAttemptRepository {
  constructor(private readonly storage: Storage = localStorage) {}

  async saveAttempt(attempt: Attempt): Promise<void> {
    const attempts = this.readAll();
    this.storage.setItem(ATTEMPTS_STORAGE_KEY, JSON.stringify([...attempts, attempt]));
  }

  async getAttemptsBySession(sessionId: string): Promise<Attempt[]> {
    return this.readAll().filter((attempt) => attempt.sessionId === sessionId);
  }

  async getRecentAttempts(limit: number): Promise<Attempt[]> {
    if (limit <= 0 || Number.isNaN(limit)) {
      return [];
    }

    return this.readAll()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, Math.floor(limit));
  }

  async clearAttempts(): Promise<void> {
    this.storage.removeItem(ATTEMPTS_STORAGE_KEY);
  }

  private readAll(): Attempt[] {
    const serialized = this.storage.getItem(ATTEMPTS_STORAGE_KEY);
    return serialized === null ? [] : parseAttempts(serialized);
  }
}
