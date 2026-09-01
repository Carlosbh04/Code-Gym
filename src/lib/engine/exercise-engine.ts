import type { ExerciseSession, ExerciseStep } from '@/types/exercise';
import type { IContentRepository } from '@/types/repository';
import type { ValidationResult } from './types';
import { validateSelection as evaluateSelection } from './validation';

/**
 * Motor de ejercicios (§24).
 *
 * Lógica pura sobre el contenido: no conoce React, ni el DOM, ni el
 * almacenamiento del navegador, ni la navegación. Lee el contenido a través de
 * `IContentRepository`, nunca de los ficheros.
 *
 * Alcance de T023: `loadSession` y `validateSelection`. Las demás operaciones
 * que enumera §24 llegan en sus tareas: `calculateScore` en T024,
 * `validateFixCode` en T042 y `getNextStep` con la sesión.
 *
 * El constructor de §24 recibe también un `ICodeExecutor`, que crea T038.
 * Mientras esa interfaz no exista, el engine se construye solo con el
 * repositorio; T042 es la tarea que integra el executor.
 */
export class ExerciseEngine {
  constructor(private readonly contentRepo: IContentRepository) {}

  /**
   * Carga una sesión por id. §24 la tipa como no nulable, así que una sesión
   * inexistente es un error y no un resultado vacío.
   */
  async loadSession(sessionId: string): Promise<ExerciseSession> {
    const session = await this.contentRepo.getSessionById(sessionId);

    if (session === null) {
      throw new Error(`Sesión no encontrada: ${sessionId}`);
    }

    return session;
  }

  /** Valida la respuesta de un paso de selección. Ver `validation.ts`. */
  validateSelection(step: ExerciseStep, answer: string): ValidationResult {
    return evaluateSelection(step, answer);
  }
}
