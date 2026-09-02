import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { ContentProvider } from '@/contexts/ContentContext';
import { ExecutionProvider } from '@/contexts/ExecutionContext';
import { ProgressProvider } from '@/contexts/ProgressContext';
import { SessionCompletionProvider } from '@/contexts/SessionCompletionContext';
import type { ExecutionContextValue } from '@/contexts/execution-context';
import { ExerciseEngine } from '@/lib/engine/exercise-engine';
import { WorkerExecutor } from '@/lib/executor/WorkerExecutor';
import { StaticContentRepository } from '@/lib/repositories/StaticContentRepository';
import { LocalAttemptRepository } from '@/lib/repositories/LocalAttemptRepository';
import { LocalCompletedSessionRepository } from '@/lib/repositories/LocalCompletedSessionRepository';
import { LocalProgressRepository } from '@/lib/repositories/LocalProgressRepository';

/**
 * Raíz de composición de la aplicación (§16, §35, D017).
 *
 * Es el único punto donde se crean implementaciones concretas: §15 se lo
 * prohíbe a hooks y componentes, y §35 establece que migrar a Fase 2 solo
 * cambia las líneas de creación de este fichero.
 *
 * El repositorio de contenido no tiene ciclo de vida —lee ficheros y cachea en
 * memoria—, así que vive en ámbito de módulo. La ejecución sí lo tiene: §26
 * asigna a `destroy()` terminar el worker, revocar su blob URL y rechazar lo
 * pendiente, de modo que su dueño es este componente.
 *
 * Los repositorios locales carecen de ciclo de vida y se comparten durante
 * toda la aplicación. Cada provider solo conoce sus interfaces.
 */

const contentRepository = new StaticContentRepository();
const progressRepository = new LocalProgressRepository();
const attemptRepository = new LocalAttemptRepository();
const completedSessionRepository = new LocalCompletedSessionRepository();

interface Execution {
  executor: WorkerExecutor;
  engine: ExerciseEngine;
}

function createExecution(): Execution {
  const executor = new WorkerExecutor();

  return { executor, engine: new ExerciseEngine(contentRepository, executor) };
}

export function AppProviders({ children }: { children: ReactNode }) {
  const engineRef = useRef<ExerciseEngine | null>(null);
  const executorRef = useRef<WorkerExecutor | null>(null);

  // La fachada es estable y no crea recursos. Así los consumidores pueden
  // montarse desde el primer render, pero el Worker se crea exclusivamente en
  // el efecto de abajo y nunca como efecto colateral de renderizar.
  const execution = useMemo<ExecutionContextValue>(
    () => ({
      validateFixCode: (step, userCode) => {
        const engine = engineRef.current;

        if (engine === null) {
          return Promise.reject(new Error('El executor todavía no está preparado'));
        }

        return engine.validateFixCode(step, userCode);
      },
    }),
    [],
  );

  useEffect(() => {
    // Crear un Worker es un efecto: debe ocurrir tras el render, no dentro de
    // él. La instancia resultante permanece estable mientras el provider esté
    // montado y conserva correctamente la cola y el watchdog del executor.
    const actual = createExecution();
    executorRef.current = actual.executor;
    engineRef.current = actual.engine;

    return () => {
      actual.executor.destroy();
      if (executorRef.current === actual.executor) executorRef.current = null;
      if (engineRef.current === actual.engine) engineRef.current = null;
    };
  }, []);

  return (
    <ProgressProvider repository={progressRepository}>
      <SessionCompletionProvider
        attemptRepository={attemptRepository}
        completedSessionRepository={completedSessionRepository}
      >
        <ContentProvider repository={contentRepository}>
          <ExecutionProvider engine={execution}>{children}</ExecutionProvider>
        </ContentProvider>
      </SessionCompletionProvider>
    </ProgressProvider>
  );
}
