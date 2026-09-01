import type { ExerciseSession, ExerciseStep, StepAnswer } from '@/types/exercise';
import type { ICodeExecutor } from '@/lib/executor/ICodeExecutor';
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
 * Operaciones de §24 disponibles: `loadSession` y `validateSelection` (T023)
 * y `validateFixCode` (T042). `calculateScore` vive en `scoring.ts` desde
 * T024 y `getNextStep` llega con la sesión.
 *
 * El constructor recibe las dos dependencias que fija §24, ambas como
 * interfaces: el contenido por `IContentRepository` y la ejecución por
 * `ICodeExecutor`. El engine no conoce `WorkerExecutor` ni ninguna otra
 * implementación, que es lo que §15 le permite y D001 le exige.
 */
export class ExerciseEngine {
  constructor(
    private readonly contentRepo: IContentRepository,
    private readonly executor: ICodeExecutor,
  ) {}

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

  /**
   * Valida la respuesta de un paso de selección. Ver `validation.ts`.
   *
   * `answer` toma la forma que fija el tipo del paso (D014): el id de la
   * opción en code-reading y predict-output, y `{ line, errorType }` en
   * find-error.
   */
  validateSelection(step: ExerciseStep, answer: StepAnswer): ValidationResult {
    return evaluateSelection(step, answer);
  }

  /**
   * Valida un paso fix-code: §24 lo resuelve «ejecutar en Worker + comparar
   * con testCases».
   *
   * Aquí no se ejecuta nada. El engine entrega el código y los casos al
   * `ICodeExecutor` y traduce su `ExecutionResult`: `pass` agrega el
   * veredicto de todos los casos (D016), así que es exactamente `isCorrect`.
   * La explicación es la del paso, igual que en `validateSelection`.
   *
   * Lo que NO hace, y es deliberado: capturar el rechazo del executor. §27
   * clasifica EXECUTION_TIMEOUT, EXECUTION_ERROR y WORKER_ERROR como errores
   * recuperables y reintentables, con su propia respuesta de interfaz
   * («Tiempo agotado» + reintentar), no como una respuesta incorrecta.
   * Convertirlos en `isCorrect: false` le diría al usuario que su código
   * está mal cuando lo que falló fue la infraestructura. El fallo de un test
   * case sí es un resultado, y llega dentro de `ExecutionResult`.
   */
  async validateFixCode(step: ExerciseStep, userCode: string): Promise<ValidationResult> {
    if (step.type !== 'fix-code') {
      throw new Error(
        `El paso ${step.id} es de tipo ${step.type}: validateFixCode solo valida pasos fix-code`,
      );
    }

    if (step.testCases === null || step.testCases.length === 0) {
      throw new Error(
        `El paso ${step.id} es fix-code pero no declara testCases con los que comparar`,
      );
    }

    const result = await this.executor.execute(userCode, step.testCases);

    return { isCorrect: result.pass, explanation: step.explanation };
  }
}
