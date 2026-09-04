import type { ExecutionContextValue } from '@/contexts/execution-context';
import type { ExecutionResult } from '@/lib/executor/types';
import type { ExerciseStep } from '@/types/exercise';
import type { ValidationResult } from '@/lib/engine/types';

/**
 * Doble del canal de ejecución para los tests de sesión (T045.1).
 *
 * Ocupa el lugar del `ExecutionContextValue` sin evaluar nada: los tests
 * unitarios de UI no necesitan ejecutar código —eso es del worker-script
 * (D001)— sino controlar el desenlace que la interfaz debe pintar: acierto,
 * fallo, error de infraestructura (§27) y validación en curso.
 *
 * La ejecución real de punta a punta la cubre el test de integración de
 * fix-code, que sí evalúa el `WORKER_SCRIPT` de verdad.
 */

type Desenlace =
  | { tipo: 'resuelve'; isCorrect: boolean }
  | { tipo: 'rechaza'; error: Error }
  | { tipo: 'diferido' };

export class FakeExecution {
  /** Cada validación recibida, para aserciones sobre el wiring. */
  llamadas: Array<{ step: ExerciseStep; userCode: string }> = [];

  private desenlace: Desenlace = { tipo: 'resuelve', isCorrect: true };
  private liberar: ((result: ValidationResult) => void) | null = null;

  /** La próxima validación resuelve con este veredicto. */
  resuelve(isCorrect: boolean): void {
    this.desenlace = { tipo: 'resuelve', isCorrect };
  }

  /** La próxima validación rechaza: timeout, worker caído o destroy (§27). */
  rechaza(mensaje: string): void {
    this.desenlace = { tipo: 'rechaza', error: new Error(mensaje) };
  }

  /** La próxima validación queda en vuelo hasta `resolverDiferido()`. */
  diferir(): void {
    this.desenlace = { tipo: 'diferido' };
    this.liberar = null;
  }

  /** Libera la validación en vuelo con el veredicto indicado. */
  resolverDiferido(isCorrect: boolean): void {
    const liberar = this.liberar;
    const paso = this.llamadas[this.llamadas.length - 1];

    this.liberar = null;
    this.desenlace = { tipo: 'resuelve', isCorrect };
    liberar?.({
      isCorrect,
      explanation: paso?.step.explanation ?? '',
      executionResult: this.resultOf(paso?.step, isCorrect),
    });
  }

  private resultOf(step: ExerciseStep | undefined, pass: boolean): ExecutionResult {
    const test = step?.testCases?.[0];

    return {
      pass,
      results: test === undefined
        ? []
        : [{
            input: test.input,
            expected: test.expected,
            actual: pass ? test.expected : null,
            pass,
            ...(pass ? {} : { error: 'El resultado no coincide con el esperado' }),
          }],
    };
  }

  executeFixCode = (step: ExerciseStep, userCode: string): Promise<ExecutionResult> => {
    this.llamadas.push({ step, userCode });

    if (this.desenlace.tipo === 'rechaza') {
      return Promise.reject(this.desenlace.error);
    }

    if (this.desenlace.tipo === 'diferido') {
      return new Promise<ExecutionResult>((resolve) => {
        this.liberar = (result) => resolve(result.executionResult!);
      });
    }

    return Promise.resolve(this.resultOf(step, this.desenlace.isCorrect));
  };

  validateFixCode = (
    step: ExerciseStep,
    userCode: string,
  ): Promise<ValidationResult> => {
    this.llamadas.push({ step, userCode });

    if (this.desenlace.tipo === 'rechaza') {
      return Promise.reject(this.desenlace.error);
    }

    if (this.desenlace.tipo === 'diferido') {
      return new Promise<ValidationResult>((resolve) => {
        this.liberar = resolve;
      });
    }

    return Promise.resolve({
      isCorrect: this.desenlace.isCorrect,
      explanation: step.explanation,
      executionResult: this.resultOf(step, this.desenlace.isCorrect),
    });
  };

  readonly value: ExecutionContextValue = {
    executeFixCode: (step, userCode) => this.executeFixCode(step, userCode),
    validateFixCode: (step, userCode) => this.validateFixCode(step, userCode),
  };
}
