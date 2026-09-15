import { LoaderCircle, ShieldCheck } from 'lucide-react';
import { HintReveal } from '@/components/codegym/HintReveal';
import { FixCodeStep } from '@/features/session/steps/FixCodeStep';
import { cn } from '@/lib/utils';
import type { ExerciseStep } from '@/types/exercise';
import type { RevealedHint } from '@/types/exercise';

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
  error: string | null;
  revealedHints: readonly RevealedHint[];
  isRevealingHint: boolean;
  onChange: (code: string) => void;
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
  error,
  revealedHints,
  isRevealingHint,
  onChange,
  onCheck,
  onRevealHint,
}: CodingWorkspaceProps) {
  if (step.type !== 'fix-code') {
    throw new Error(
      'CodingWorkspace solo puede mostrar pasos fix-code',
    );
  }

  return (
    <section aria-label="Espacio de código" className="grid min-w-0 gap-4 sm:gap-5">
      <div className="grid min-w-0 gap-4 sm:gap-5 lg:grid-cols-[minmax(17rem,0.72fr)_minmax(0,1.28fr)]">
        <aside aria-label="Enunciado y requisitos" className="flex min-w-0 flex-col rounded-2xl border border-border bg-card p-5 sm:p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Reto de código</p>
            <h2 className="mt-2 text-xl font-semibold leading-tight text-foreground">{sessionTitle}</h2>
            <p className="mt-4 text-sm leading-relaxed text-foreground">{step.prompt}</p>
          </div>
          <div className="mt-6 border-t border-border pt-5">
            <h3 className="text-sm font-semibold text-foreground">Requisitos</h3>
            <ul className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground">
              {(step.requirements ?? []).map((requirement, index) => (
                <li key={index} className="flex gap-3">
                  <span
                    aria-hidden="true"
                    className="mt-2 size-1.5 shrink-0 rounded-full bg-primary"
                  />
                  <span>{requirement}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-auto pt-6">
            <HintReveal
              totalHints={step.hintCount}
              revealedHints={revealedHints}
              onReveal={onRevealHint}
              disabled={disabled}
              isRevealing={isRevealingHint}
            />
          </div>
        </aside>

        <section aria-labelledby="code-solution-title" className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="flex min-h-14 items-center justify-between gap-3 border-b border-border px-4 sm:px-5">
            <h2 id="code-solution-title" className="text-sm font-semibold text-foreground">Tu solución</h2>
            <span className="rounded-md border border-primary/25 bg-primary/10 px-2.5 py-1 font-mono text-xs uppercase tracking-wide text-primary">
              {step.language ?? 'Código'}
            </span>
          </div>
          <div className="min-w-0 p-3 sm:p-4">
            <FixCodeStep step={step} value={value} onChange={onChange} disabled={disabled} showPrompt={false} />
          </div>
          <div aria-label="Acciones de código" className="flex flex-wrap justify-end gap-3 border-t border-border px-4 py-4 sm:px-5">
            <button type="button" onClick={onCheck} disabled={!canRun || disabled || isRunning} aria-busy={isRunning} className={cn(BUTTON, 'bg-primary text-primary-foreground hover:bg-primary/90')}>
              {isRunning ? (
                <LoaderCircle
                  aria-hidden="true"
                  className="size-4 animate-spin"
                />
              ) : (
                <ShieldCheck
                  aria-hidden="true"
                  className="size-4"
                />
              )}
              {isRunning
                ? 'Comprobando…'
                : status === 'error'
                  ? 'Reintentar'
                  : 'Comprobar'}
            </button>
          </div>
        </section>
      </div>

      <div
        role={status === 'error' ? 'alert' : 'status'}
        aria-live="polite"
        className="min-w-0 rounded-2xl border border-border bg-card p-4 text-sm text-foreground"
      >
        {status === 'idle' && (
          <p>
            Escribe tu solución y pulsa «Comprobar».
          </p>
        )}

        {status === 'running' && (
          <p>
            El servidor está comprobando tu solución…
          </p>
        )}

        {status === 'passed' && (
          <p>
            Solución correcta. Todos los tests privados del servidor han pasado.
          </p>
        )}

        {status === 'failed' && (
          <p>
            La solución todavía no supera todos los tests.
          </p>
        )}

        {status === 'error' && (
          <p>
            No se pudo comprobar la solución: {error ?? 'error desconocido'}.
          </p>
        )}
      </div>
    </section>
  );
}
