import { createContext } from 'react';
import type { ExecutionResult, ValidationResult } from '@/lib/engine/types';
import type { ExerciseStep } from '@/types/exercise';

/**
 * Canal por el que la raíz de composición entrega la ejecución de código a la
 * sesión (§15, D017).
 *
 * Vive en su propio módulo, sin componentes, por la misma razón que
 * `content-context.ts`: `react-refresh/only-export-components` no admite que un
 * fichero de componentes exporte además otras cosas.
 *
 * El valor NO es el `ExerciseEngine` entero, sino lo mínimo que la sesión
 * necesita. Así el hook no puede llamar a `loadSession` por su cuenta ni
 * saltarse el ContentContext, y `ExerciseEngine` lo satisface estructuralmente
 * sin necesidad de adaptadores.
 */
export interface ExecutionContextValue {
  /** Ejecuta tests canónicos sin convertir el intento en respuesta de sesión. */
  executeFixCode(step: ExerciseStep, userCode: string): Promise<ExecutionResult>;
  /**
   * Valida un paso fix-code ejecutando su código. Ver
   * `ExerciseEngine.validateFixCode`: resuelve con el veredicto y **rechaza**
   * cuando falla la infraestructura (§27).
   */
  validateFixCode(step: ExerciseStep, userCode: string): Promise<ValidationResult>;
}

export const ExecutionContext = createContext<ExecutionContextValue | null>(null);
