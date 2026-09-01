import type { TestCase } from '@/types/exercise';
import type { ExecutionResult } from './types';

/**
 * Contrato de ejecución de código del usuario (§25, §26, D001).
 *
 * Es la frontera que §15 autoriza al engine a conocer: «Engine → puede usar:
 * IContentRepository, ICodeExecutor (interfaces)». El engine depende de esta
 * interfaz y nunca del mecanismo concreto, así que ejecutar código jamás
 * ocurre en el engine, en un hook ni en un componente.
 *
 * La implementación de esta interfaz es `WorkerExecutor` (T039), que ejecuta
 * dentro de un Web Worker. Su integración en `ExerciseEngine` es T042.
 *
 * §25 fija los límites que cualquier implementación debe respetar: timeout de
 * 3000 ms, una sola ejecución simultánea y cola FIFO para las siguientes.
 */
export interface ICodeExecutor {
  /**
   * Ejecuta `code` contra cada test case y resuelve con el resultado agregado.
   *
   * Rechaza —no resuelve— cuando la ejecución no llega a producir resultados:
   * §26 asigna al timeout y al fallo del worker la rama `reject`. Un test case
   * que lanza sí es un resultado, y viaja en `TestCaseResult.error`.
   */
  execute(code: string, testCases: TestCase[]): Promise<ExecutionResult>;

  /** Libera los recursos de la implementación y descarta lo que quede en curso. */
  destroy(): void;
}
