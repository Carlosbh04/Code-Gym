import { useContext } from 'react';
import {
  ExecutionContext,
  type ExecutionContextValue,
} from '@/contexts/execution-context';

/**
 * Acceso de la sesión a la ejecución de código (§15, §16, D017).
 *
 * §15 y §16 nombran este hook en la capa de Hooks, pero ninguna sección define
 * su firma: se le da la mínima que la sesión necesita, que es validar un paso
 * fix-code.
 *
 * No crea nada. §15 prohíbe a los hooks usar implementaciones concretas, así
 * que el `WorkerExecutor` y el `ExerciseEngine` los construye `providers.tsx` y
 * llegan aquí por el contexto. Este fichero no conoce ni el executor ni el
 * Worker.
 */
export function useCodeExecution(): ExecutionContextValue {
  const value = useContext(ExecutionContext);

  if (value === null) {
    throw new Error('useCodeExecution debe usarse dentro de <ExecutionProvider>');
  }

  return value;
}
