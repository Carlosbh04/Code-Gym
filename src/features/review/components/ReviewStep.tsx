import {
  CircleCheck,
  CircleX,
} from 'lucide-react';

import {
  ExerciseCard,
} from '@/components/codegym/ExerciseCard';

import {
  CodeBlock,
} from '@/components/codegym/CodeBlock';

import type {
  ExerciseStep,
} from '@/types/exercise';

import type {
  HistoryAttempt,
} from '@/types/history';

import {
  cn,
} from '@/lib/utils';

interface ReviewStepProps {
  readonly step: ExerciseStep;

  readonly attempt:
    HistoryAttempt | undefined;

  readonly position: number;
}

export function ReviewStep({
  step,
  attempt,
  position,
}: ReviewStepProps) {
  const hasAttempt =
    attempt !== undefined;

  return (
    <ExerciseCard
      state={
        hasAttempt
          ? 'answered'
          : 'default'
      }
    >
      <div className="flex min-w-0 flex-col gap-5">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
              Pregunta {position}
            </p>

            <h2 className="mt-2 text-xl font-bold leading-snug text-foreground sm:text-2xl">
              {step.prompt}
            </h2>
          </div>

          {hasAttempt && (
            <p
              className={cn(
                'inline-flex shrink-0 items-center gap-2 self-start rounded-full border px-3 py-1.5 text-sm font-semibold',
                attempt.isCorrect
                  ? 'border-success/40 bg-success/10 text-success'
                  : 'border-destructive/40 bg-destructive/10 text-destructive',
              )}
            >
              {attempt.isCorrect ? (
                <CircleCheck
                  aria-hidden="true"
                  className="size-4"
                />
              ) : (
                <CircleX
                  aria-hidden="true"
                  className="size-4"
                />
              )}

              {attempt.isCorrect
                ? 'Respuesta correcta'
                : 'Respuesta incorrecta'}
            </p>
          )}
        </header>

        {step.code !== null && (
          <section
            aria-labelledby={
              `review-step-code-${step.id}`
            }
          >
            <h3
              id={
                `review-step-code-${step.id}`
              }
              className="mb-2 text-sm font-semibold text-foreground"
            >
              {step.type === 'fix-code'
                ? 'Código inicial'
                : 'Código del ejercicio'}
            </h3>

            <CodeBlock
              code={step.code}
              language={
                step.language
                ?? 'javascript'
              }
              showLineNumbers={
                step.type
                === 'find-error'
              }
            />
          </section>
        )}

        {hasAttempt ? (
          <section
            aria-labelledby={
              `review-step-result-${step.id}`
            }
            className={cn(
              'rounded-xl border p-4',
              attempt.isCorrect
                ? 'border-success/30 bg-success/5'
                : 'border-destructive/30 bg-destructive/5',
            )}
          >
            <h3
              id={
                `review-step-result-${step.id}`
              }
              className="mb-2 text-sm font-semibold text-foreground"
            >
              Resultado registrado
            </h3>

            <p className="text-sm text-muted-foreground">
              El historial conserva el
              resultado del intento, pero
              no la respuesta enviada.
            </p>

            {attempt.hintsUsed
              !== null
              && attempt.hintsUsed
                > 0 && (
                <p className="mt-3 text-sm text-muted-foreground">
                  Pistas utilizadas:{' '}
                  {
                    attempt.hintsUsed
                  }
                </p>
              )}
          </section>
        ) : (
          <p className="rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
            Sin respuesta registrada.
          </p>
        )}
      </div>
    </ExerciseCard>
  );
}
