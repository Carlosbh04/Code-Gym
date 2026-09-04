import { Play, ShieldCheck } from 'lucide-react';
import { HintReveal } from '@/components/codegym/HintReveal';
import { FixCodeStep } from '@/features/session/steps/FixCodeStep';
import { cn } from '@/lib/utils';
import type { ExecutionResult } from '@/lib/engine/types';
import type { ExerciseStep } from '@/types/exercise';
import { ExecutionPanel } from './ExecutionPanel';

const BUTTON =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-5 py-2.5 text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50';

export interface CodingWorkspaceProps {
  sessionTitle: string;
  step: ExerciseStep;
  value: string | null;
  disabled: boolean;
  isRunning: boolean;
  canRun: boolean;
  status: 'idle' | 'running' | 'passed' | 'failed' | 'error';
  result: ExecutionResult | null;
  error: string | null;
  hintsRevealed: number;
  onChange: (code: string) => void;
  onRun: () => void;
  onCheck: () => void;
  onRevealHint: () => void;
}

/** Composición responsive del reto, editor y consola de un step fix-code. */
export function CodingWorkspace({
  sessionTitle,
  step,
  value,
  disabled,
  isRunning,
  canRun,
  status,
  result,
  error,
  hintsRevealed,
  onChange,
  onRun,
  onCheck,
  onRevealHint,
}: CodingWorkspaceProps) {
  if (step.type !== 'fix-code' || step.testCases === null) {
    throw new Error('CodingWorkspace solo puede mostrar pasos fix-code con tests');
  }

  return (
    <section aria-label="Espacio de código" className="grid min-w-0 gap-5 lg:grid-cols-[minmax(17rem,0.7fr)_minmax(0,1.3fr)]">
      <aside className="order-1 flex flex-col gap-4 rounded-lg border border-border bg-card p-4 lg:row-span-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Reto de código</p>
          <h2 className="mt-1 text-lg font-semibold text-foreground">{sessionTitle}</h2>
          <p className="mt-3 text-sm leading-relaxed text-foreground">{step.prompt}</p>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">Requisitos</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {step.testCases.map((test, index) => <li key={index}>{test.description}</li>)}
          </ul>
        </div>
      </aside>

      <div className="order-2 min-w-0 rounded-lg border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Tu solución</h2>
        <FixCodeStep step={step} value={value} onChange={onChange} disabled={disabled} showPrompt={false} />
        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" onClick={onRun} disabled={!canRun || disabled || isRunning} aria-busy={isRunning} className={cn(BUTTON, 'border border-border bg-card text-foreground hover:bg-accent')}>
            <Play aria-hidden="true" className="size-4" />
            {isRunning ? 'Ejecutando…' : 'Ejecutar tests'}
          </button>
          <button type="button" onClick={onCheck} disabled={!canRun || disabled || isRunning} aria-busy={isRunning} className={cn(BUTTON, 'bg-primary text-primary-foreground hover:bg-primary/90')}>
            <ShieldCheck aria-hidden="true" className="size-4" />
            {status === 'error' ? 'Reintentar' : 'Comprobar'}
          </button>
        </div>
      </div>

      <div className="order-3 min-w-0"><ExecutionPanel status={status} result={result} error={error} testCases={step.testCases} /></div>
      <div className="order-4 lg:col-start-1"><HintReveal hints={step.hints} revealedCount={hintsRevealed} onReveal={onRevealHint} disabled={disabled} /></div>
    </section>
  );
}
