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
      className="grid min-w-0 gap-4 sm:gap-5"
    >
      <div className="grid min-w-0 gap-4 sm:gap-5 lg:grid-cols-[minmax(17rem,0.72fr)_minmax(0,1.28fr)]">
        <aside
          aria-label="Enunciado y requisitos"
          className="flex min-w-0 flex-col rounded-2xl border border-border bg-card p-5 sm:p-6"
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Reto de código
            </p>

            <h2 className="mt-2 text-xl font-semibold leading-tight text-foreground">
              {sessionTitle}
            </h2>

            <p className="mt-4 text-sm leading-relaxed text-foreground">
              {step.prompt}
            </p>
          </div>

          <div className="mt-6 border-t border-border pt-5">
            <h3 className="text-sm font-semibold text-foreground">
              Requisitos
            </h3>

            <ul className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground">
              {(step.requirements ?? []).map(
                (
                  requirement,
                  index,
                ) => (
                  <li
                    key={index}
                    className="flex gap-3"
                  >
                    <span
                      aria-hidden="true"
                      className="mt-2 size-1.5 shrink-0 rounded-full bg-primary"
                    />

                    <span>
                      {requirement}
                    </span>
                  </li>
                ),
              )}
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

        <section
          aria-labelledby="code-solution-title"
          className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
        >
          <div className="flex min-h-14 items-center justify-between gap-3 border-b border-border px-4 sm:px-5">
            <h2
              id="code-solution-title"
              className="text-sm font-semibold text-foreground"
            >
              Tu solución
            </h2>

            <span className="rounded-md border border-primary/25 bg-primary/10 px-2.5 py-1 font-mono text-xs uppercase tracking-wide text-primary">
              {step.language ?? 'Código'}
            </span>
          </div>

          <div className="min-w-0 p-3 sm:p-4">
            <FixCodeStep
              step={step}
              value={value}
              onChange={onChange}
              disabled={disabled}
              showPrompt={false}
            />
          </div>

          <div
            aria-label="Acciones de código"
            className="flex flex-wrap justify-end gap-3 border-t border-border px-4 py-4 sm:px-5"
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
                'border border-border bg-background text-foreground hover:bg-muted',
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
      </div>

      <div className="grid gap-3">
        <div
          role={
            previewStatus === 'error'
              ? 'alert'
              : 'status'
          }
          aria-live="polite"
          className="min-w-0 rounded-2xl border border-border bg-card p-4 text-sm text-foreground"
        >
          {previewStatus === 'idle' && (
            <p>
              Puedes ejecutar los tests públicos antes de comprobar la solución.
            </p>
          )}

          {previewStatus === 'running' && (
            <p>
              Ejecutando los tests públicos…
            </p>
          )}

          {previewStatus === 'passed' && (
            <p>
              La ejecución pasó los tests públicos. Usa «Comprobar» para validar la solución completa.
            </p>
          )}

          {previewStatus === 'failed' && (
            <p>
              La ejecución todavía no supera los tests públicos. Puedes corregir el código y volver a ejecutar.
            </p>
          )}

          {previewStatus === 'error' && (
            <p>
              No se pudo ejecutar el preview: {previewError ?? 'error desconocido'}.
            </p>
          )}
        </div>

        <div
          role={
            checkStatus === 'error'
              ? 'alert'
              : 'status'
          }
          aria-live="polite"
          className="min-w-0 rounded-2xl border border-border bg-card p-4 text-sm text-foreground"
        >
          {checkStatus === 'idle' && (
            <p>
              «Comprobar» realiza la validación autoritativa del ejercicio.
            </p>
          )}

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
        </div>
      </div>
    </section>
  );
}
