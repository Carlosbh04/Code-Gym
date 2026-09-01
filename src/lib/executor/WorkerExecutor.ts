import type { TestCase } from '@/types/exercise';
import type { ICodeExecutor } from './ICodeExecutor';
import type { ExecutionResult, TestCaseResult } from './types';
import { WORKER_SCRIPT } from './worker-script';

/**
 * Ejecuta el código del usuario dentro de un Web Worker (§25, §26, D001).
 *
 * Es la única implementación de `ICodeExecutor` y la única pieza del proyecto
 * que crea un Worker. Nada de lo que hay aquí ejecuta el código: lo empaqueta,
 * lo manda al worker y vigila el reloj. La evaluación vive en `worker-script`,
 * al otro lado de la frontera.
 *
 * Límites de §25: timeout de 3000 ms, una sola ejecución simultánea y cola
 * FIFO para las siguientes.
 *
 * Ciclo de vida de §26:
 *   CONSTRUCTOR → createWorker()
 *   EJECUCIÓN   → postMessage → watchdog 3s → resolve/reject
 *   TIMEOUT     → pending.delete → terminate → createWorker → reject
 *   ERROR       → terminate → createWorker → reject pending
 *   DESTRUIR    → terminate → revoke URL → reject all → clear
 */

/** §25: el watchdog corta a los 3 segundos. */
export const EXECUTION_TIMEOUT_MS = 3000;

interface PendingExecution {
  resolve: (result: ExecutionResult) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

interface QueuedExecution {
  code: string;
  testCases: TestCase[];
  resolve: (result: ExecutionResult) => void;
  reject: (error: Error) => void;
}

export class WorkerExecutor implements ICodeExecutor {
  private worker: Worker | null = null;
  private workerUrl: string | null = null;
  private pending: Map<string, PendingExecution> = new Map();
  private queue: QueuedExecution[] = [];
  private isExecuting = false;
  private destroyed = false;
  private nextId = 0;

  constructor() {
    this.createWorker();
  }

  async execute(code: string, testCases: TestCase[]): Promise<ExecutionResult> {
    if (this.destroyed) {
      throw new Error('El executor ya se ha destruido');
    }

    if (this.isExecuting) {
      return new Promise<ExecutionResult>((resolve, reject) => {
        this.queue.push({ code, testCases, resolve, reject });
      });
    }

    return this.runExecution(code, testCases);
  }

  destroy(): void {
    this.destroyed = true;

    this.terminateWorker();

    const cerrado = new Error('El executor se ha destruido durante la ejecución');
    for (const execution of this.pending.values()) {
      clearTimeout(execution.timer);
      execution.reject(cerrado);
    }
    this.pending.clear();

    for (const queued of this.queue) {
      queued.reject(cerrado);
    }
    this.queue = [];

    this.isExecuting = false;
  }

  private createWorker(): void {
    const blob = new Blob([WORKER_SCRIPT], { type: 'application/javascript' });

    this.workerUrl = URL.createObjectURL(blob);
    this.worker = new Worker(this.workerUrl);
    this.worker.onmessage = (event: MessageEvent) => {
      this.handleMessage(event);
    };
    this.worker.onerror = (event: ErrorEvent) => {
      this.handleError(event);
    };
  }

  /** Termina el worker y revoca su blob URL. No toca pending ni queue. */
  private terminateWorker(): void {
    if (this.worker !== null) {
      this.worker.onmessage = null;
      this.worker.onerror = null;
      this.worker.terminate();
      this.worker = null;
    }

    if (this.workerUrl !== null) {
      URL.revokeObjectURL(this.workerUrl);
      this.workerUrl = null;
    }
  }

  private runExecution(code: string, testCases: TestCase[]): Promise<ExecutionResult> {
    const id = String(this.nextId++);
    this.isExecuting = true;

    return new Promise<ExecutionResult>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        this.terminateWorker();
        this.createWorker();
        this.finishExecution();
        reject(new Error(`La ejecución superó el límite de ${EXECUTION_TIMEOUT_MS} ms`));
      }, EXECUTION_TIMEOUT_MS);

      this.pending.set(id, { resolve, reject, timer });
      this.worker?.postMessage({ type: 'execute', id, code, testCases });
    });
  }

  /**
   * §26 enumera seis comprobaciones antes de aceptar un mensaje. Cualquiera que
   * falle lo ignora: un mensaje que no reconocemos no puede resolver nada.
   */
  private handleMessage(event: MessageEvent): void {
    const data: unknown = event.data;

    if (typeof data !== 'object' || data === null) return;

    const message = data as { type?: unknown; id?: unknown; results?: unknown };

    if (message.type !== 'result') return;
    if (typeof message.id !== 'string') return;
    if (!Array.isArray(message.results)) return;

    const execution = this.pending.get(message.id);
    if (execution === undefined) return;

    clearTimeout(execution.timer);
    this.pending.delete(message.id);
    this.finishExecution();

    const results = message.results as TestCaseResult[];
    execution.resolve({ pass: results.every((result) => result.pass), results });
  }

  /** Un worker caído no puede completar nada: se recrea y se rechaza lo vivo. */
  private handleError(event: ErrorEvent): void {
    if (this.destroyed) return;

    this.terminateWorker();
    this.createWorker();

    const fallo = new Error(
      event.message === '' || event.message === undefined
        ? 'El worker falló durante la ejecución'
        : event.message,
    );

    for (const execution of this.pending.values()) {
      clearTimeout(execution.timer);
      execution.reject(fallo);
    }
    this.pending.clear();

    this.finishExecution();
  }

  /** Cierra la ejecución en curso y arranca la siguiente de la cola, en orden. */
  private finishExecution(): void {
    this.isExecuting = false;

    const next = this.queue.shift();
    if (next === undefined || this.destroyed) return;

    this.runExecution(next.code, next.testCases).then(next.resolve, next.reject);
  }
}
