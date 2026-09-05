import { CircleCheck, CircleX, LoaderCircle, Terminal } from 'lucide-react';
import type { ExecutionResult } from '@/lib/engine/types';
import type { TestCase } from '@/types/exercise';
import { TestResults } from './TestResults';

export interface ExecutionPanelProps {
  status: 'idle' | 'running' | 'passed' | 'failed' | 'error';
  result: ExecutionResult | null;
  error: string | null;
  testCases: TestCase[];
}

/** Consola de los tests canónicos: no es una shell ni ejecuta comandos. */
export function ExecutionPanel({ status, result, error, testCases }: ExecutionPanelProps) {
  const summary =
    status === 'running'
      ? 'Ejecutando tests canónicos…'
      : status === 'passed'
        ? 'Todos los tests han pasado.'
        : status === 'failed'
          ? 'Hay tests que necesitan corrección.'
          : status === 'error'
            ? `No se pudo ejecutar: ${error ?? 'error desconocido'}`
            : 'Listo para ejecutar los tests canónicos.';

  const Icon = status === 'running' ? LoaderCircle : status === 'passed' ? CircleCheck : status === 'failed' || status === 'error' ? CircleX : Terminal;

  return (
    <section
      aria-labelledby="execution-panel-title"
      className="min-w-0 rounded-2xl border border-code-border bg-code p-4 text-code-foreground shadow-inner sm:p-5"
    >
      <div className="flex items-center gap-2">
        <Terminal aria-hidden="true" className="size-4 text-muted-foreground" />
        <h2 id="execution-panel-title" className="font-mono text-sm font-semibold">
          TERMINAL · TESTS
        </h2>
      </div>
      <p
        role={status === 'error' ? 'alert' : 'status'}
        aria-live="polite"
        className={`mt-3 flex items-start gap-2 font-mono text-sm ${status === 'passed' ? 'text-success' : status === 'failed' || status === 'error' ? 'text-destructive' : 'text-code-foreground'}`}
      >
        <Icon
          aria-hidden="true"
          className={`mt-0.5 size-4 shrink-0 ${status === 'running' ? 'animate-spin' : ''}`}
        />
        <span>{summary}</span>
      </p>
      {result !== null && <div className="mt-4 border-t border-code-border pt-4"><TestResults result={result} testCases={testCases} /></div>}
    </section>
  );
}
