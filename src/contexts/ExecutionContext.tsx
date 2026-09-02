import { useMemo, type ReactNode } from 'react';
import {
  ExecutionContext,
  type ExecutionContextValue,
} from '@/contexts/execution-context';

/**
 * Provee la ejecución de código a la sesión (§15, D017).
 *
 * Recibe ya construido lo que ejecuta: crear implementaciones concretas es
 * responsabilidad de la raíz de composición, no de un contexto. Aquí solo se
 * estrecha el engine a la superficie que la sesión necesita.
 */
export interface ExecutionProviderProps {
  /** Normalmente el `ExerciseEngine`, que satisface esta forma. */
  engine: ExecutionContextValue;
  children: ReactNode;
}

export function ExecutionProvider({ engine, children }: ExecutionProviderProps) {
  const value = useMemo<ExecutionContextValue>(
    () => ({
      validateFixCode: (step, userCode) => engine.validateFixCode(step, userCode),
    }),
    [engine],
  );

  return <ExecutionContext.Provider value={value}>{children}</ExecutionContext.Provider>;
}
