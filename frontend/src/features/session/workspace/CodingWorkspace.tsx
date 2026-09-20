import {
  LoaderCircle,
  Play,
  ShieldCheck,
} from 'lucide-react';

import { HintReveal } from '@/components/codegym/HintReveal';
import { FixCodeStep } from '@/features/session/steps/FixCodeStep';
import { cn } from '@/lib/utils';
import type {
  ExerciseStep,
  RevealedHint,
} from '@/types/exercise';

const BUTTON =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-5 py-2.5 text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50';

type ExecutionStatus =
  | 'idle'
  | 'running'
  | 'passed'
  | 'failed'
  | 'error';

export interface CodingWorkspaceProps {
  sessionTitle: string;
  step: ExerciseStep;
  value: string | null;
  disabled: boolean;

  /** Comprobación autoritativa completa. */
  isChecking: boolean;
  canCheck: boolean;
  checkStatus: ExecutionStatus;
  checkError: string | null;

  /** Preview funcional público. */
  canExecute: boolean;
  previewStatus: ExecutionStatus;
  previewError: string | null;

  revealedHints: readonly RevealedHint[];
  isRevealingHint: boolean;

  onChange: (code: string) => void;
  onExecute: () => void;
  onCheck: () => void;
  onRevealHint: () => void;
}

/** Composición responsive del reto, editor y consola de un step fix-code. */
export function CodingWorkspace({
  sessionTitle,
  step,
  value,
  disabled,
  isChecking,
  canCheck,
  checkStatus,
  checkError,
  canExecute,
  previewStatus,
  previewError,
  revealedHints,
  isRevealingHint,
  onChange,
  onExecute,
  onCheck,
  onRevealHint,
}: CodingWorkspaceProps) {
  if (step.type !== 'fix-code') {
    throw new Error(
      'CodingWorkspace solo puede mostrar pasos fix-code',
    );
  }

  const isPreviewRunning =
    previewStatus === 'running';

  const actionsBusy =
    isChecking
    || isPreviewRunning;

  return (
    <section
      aria-label="Espacio de código"
      className="grid min-w-0 gap-5 xl:grid-cols-[minmax(18rem,0.72fr)_minmax(0,1.28fr)]"
    >
      <aside
        aria-label="Enunciado y requisitos"
        className="order-1 flex flex-col gap-5 rounded-2xl border border-border bg-card p-5 xl:row-span-2 xl:p-6"
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Reto de código
          </p>

          <h2 className="mt-1 text-lg font-semibold text-foreground">
            {sessionTitle}
          </h2>

          <p className="mt-3 text-sm leading-relaxed text-foreground">
            {step.prompt}
          </p>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Requisitos
          </h3>

          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {(step.requirements ?? []).map(
              (
                requirement,
                index,
              ) => (
                <li key={index}>
                  {requirement}
                </li>
              ),
            )}
          </ul>
        </div>
      </aside>

      <section
        aria-labelledby="code-solution-title"
        className="order-2 min-w-0 rounded-2xl border border-border bg-card p-4 sm:p-5 xl:p-6"
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2
            id="code-solution-title"
            className="text-sm font-semibold text-foreground"
          >
            Tu solución
          </h2>

          <span className="text-xs text-muted-foreground">
            {step.language ?? 'Código'}
          </span>
        </div>

        <FixCodeStep
          step={step}
          value={value}
          onChange={onChange}
          disabled={disabled}
          showPrompt={false}
        />

        <div
          aria-label="Acciones de código"
          className="mt-4 flex flex-wrap gap-3"
        >
          <button
            type="button"
            onClick={onExecute}
            disabled={
              !canExecute
              || disabled
              || actionsBusy
            }
            aria-busy={isPreviewRunning}
            className={cn(
              BUTTON,
              'border border-border bg-card text-foreground hover:bg-accent',
            )}
          >
            {isPreviewRunning ? (
              <LoaderCircle
                aria-hidden="true"
                className="size-4 animate-spin"
              />
            ) : (
              <Play
                aria-hidden="true"
                className="size-4"
              />
            )}

            {isPreviewRunning
              ? 'Ejecutando…'
              : previewStatus === 'error'
                ? 'Reintentar ejecución'
                : 'Ejecutar'}
          </button>

          <button
            type="button"
            onClick={onCheck}
            disabled={
              !canCheck
              || disabled
              || actionsBusy
            }
            aria-busy={isChecking}
            className={cn(
              BUTTON,
              'bg-primary text-primary-foreground hover:bg-primary/90',
            )}
          >
            {isChecking ? (
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

            {isChecking
              ? 'Comprobando…'
              : checkStatus === 'error'
                ? 'Reintentar comprobación'
                : 'Comprobar'}
          </button>
        </div>
      </section>

      <div className="order-3 min-w-0 xl:col-start-2">
        <div
          role={
            checkStatus === 'error'
            || previewStatus === 'error'
              ? 'alert'
              : 'status'
          }
          aria-live="polite"
          className="min-w-0 rounded-2xl border border-border bg-card p-4 text-sm text-foreground"
        >
          {checkStatus === 'running' && (
            <p>
              El servidor está comprobando tu solución…
            </p>
          )}

          {checkStatus === 'passed' && (
            <p>
              Solución correcta. La validación completa del servidor ha pasado.
            </p>
          )}

          {checkStatus === 'failed' && (
            <p>
              La solución todavía no supera la validación completa.
            </p>
          )}

          {checkStatus === 'error' && (
            <p>
              No se pudo comprobar la solución: {checkError ?? 'error desconocido'}.
            </p>
          )}

          {checkStatus === 'idle'
            && previewStatus === 'idle' && (
              <p>
                Puedes ejecutar tu código antes de comprobar la solución.
              </p>
            )}

          {checkStatus === 'idle'
            && previewStatus === 'running' && (
              <p>
                Ejecutando los tests públicos…
              </p>
            )}

          {checkStatus === 'idle'
            && previewStatus === 'passed' && (
              <p>
                La ejecución pasó los tests públicos. Usa «Comprobar» para validar la solución completa.
              </p>
            )}

          {checkStatus === 'idle'
            && previewStatus === 'failed' && (
              <p>
                La ejecución todavía no supera los tests públicos. Esto no es la validación autoritativa; corrige el código y vuelve a ejecutar o usa «Comprobar» cuando esté listo.
              </p>
            )}

          {checkStatus === 'idle'
            && previewStatus === 'error' && (
              <p>
                No se pudo ejecutar el código: {previewError ?? 'error desconocido'}.
              </p>
            )}
        </div>
      </div>

      <div className="order-4 xl:col-start-1">
        <HintReveal
          totalHints={step.hintCount}
          revealedHints={revealedHints}
          onReveal={onRevealHint}
          disabled={disabled}
          isRevealing={isRevealingHint}
        />
      </div>
    </section>
  );
}
