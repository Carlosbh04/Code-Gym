import type { ConceptProgress } from '@/types/progress';
import type { IProgressRepository } from './IProgressRepository';

/** Clave de almacenamiento definida por §20 y §29. */
export const PROGRESS_STORAGE_KEY = 'codegym:progress';

type ProgressByConcept = Record<string, ConceptProgress>;

function isProgressByConcept(value: unknown): value is ProgressByConcept {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Persistencia local de `ConceptProgress` detrás de `IProgressRepository`.
 *
 * La representación de `localStorage` es un objeto indexado por `conceptId`;
 * la interfaz, en cambio, solo expone progreso y operaciones de dominio. Así
 * una futura implementación remota puede respetar el mismo contrato sin
 * conocer claves, JSON ni la plataforma Storage (D002).
 *
 * Ausencia de clave y JSON corrupto equivalen a un progreso vacío. El JSON
 * inválido se ignora sin borrar nada: una escritura posterior lo sustituye de
 * forma atómica. Los fallos reales de `Storage` (acceso denegado, cuota llena,
 * etc.) no se silencian; la promesa rechaza para que la capa de contexto pueda
 * mostrar su estado recuperable y aplicar el fallback que corresponda (§27).
 */
export class LocalProgressRepository implements IProgressRepository {
  constructor(private readonly storage: Storage = localStorage) {}

  async getConceptProgress(conceptId: string): Promise<ConceptProgress | null> {
    return this.readAll()[conceptId] ?? null;
  }

  async getAllProgress(): Promise<ConceptProgress[]> {
    return Object.values(this.readAll());
  }

  async updateProgress(conceptId: string, progress: ConceptProgress): Promise<void> {
    const all = this.readAll();
    this.storage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify({ ...all, [conceptId]: progress }));
  }

  async clearProgress(): Promise<void> {
    this.storage.removeItem(PROGRESS_STORAGE_KEY);
  }

  private readAll(): ProgressByConcept {
    const serialized = this.storage.getItem(PROGRESS_STORAGE_KEY);

    if (serialized === null) {
      return {};
    }

    try {
      const parsed: unknown = JSON.parse(serialized);
      return isProgressByConcept(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
}
