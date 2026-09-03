import { CodeBlock } from '@/components/codegym/CodeBlock';
import { ExerciseCard } from '@/components/codegym/ExerciseCard';
import type { ExerciseStep, FindErrorAnswer } from '@/types/exercise';
import type { Attempt } from '@/types/progress';

export interface ReviewStepProps {
  step: ExerciseStep;
  attempt: Attempt | undefined;
  position: number;
}

function isFindErrorAnswer(answer: unknown): answer is FindErrorAnswer {
  return (
    typeof answer === 'object' &&
    answer !== null &&
    'line' in answer &&
    typeof answer.line === 'number' &&
    'errorType' in answer &&
    typeof answer.errorType === 'string'
  );
}

function optionText(step: ExerciseStep, answer: unknown): string | null {
  if (typeof answer !== 'string' && typeof answer !== 'number') return null;
  const option = step.options?.find((candidate) => candidate.id === String(answer));
  return option?.text ?? String(answer);
}

function AnswerValue({ step, answer }: { step: ExerciseStep; answer: unknown }) {
  if (step.type === 'find-error' && isFindErrorAnswer(answer)) {
    return (
      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">Línea seleccionada</dt>
          <dd className="mt-1 font-medium text-foreground">Línea {answer.line}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Tipo seleccionado</dt>
          <dd className="mt-1 font-medium text-foreground">{answer.errorType}</dd>
        </div>
      </dl>
    );
  }

  if (step.type === 'fix-code' && typeof answer === 'string') {
    return <CodeBlock code={answer} language={step.language ?? 'javascript'} />;
  }

  const text = optionText(step, answer);
  if (text !== null) {
    return <p className="break-words text-sm text-foreground">{text}</p>;
  }

  return (
    <p className="text-sm text-muted-foreground">
      La respuesta registrada no tiene un formato compatible para mostrarla.
    </p>
  );
}

/** Representación estática de un step y su Attempt persistido (T060). */
export function ReviewStep({ step, attempt, position }: ReviewStepProps) {
  const hasAttempt = attempt !== undefined;

  return (
    <ExerciseCard state={hasAttempt ? 'answered' : 'default'}>
      <div className="flex flex-col gap-5">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="font-mono text-xs text-muted-foreground">Ejercicio {position}</p>
            <h3 className="mt-1 text-lg font-bold text-foreground">{step.prompt}</h3>
          </div>
          {hasAttempt ? (
            <p
              className={
                attempt.isCorrect
                  ? 'text-sm font-semibold text-success'
                  : 'text-sm font-semibold text-destructive'
              }
            >
              {attempt.isCorrect ? 'Correcto' : 'Incorrecto'}
            </p>
          ) : null}
        </header>

        {step.code !== null && (
          <section aria-labelledby={`review-step-code-${step.id}`}>
            <h4
              id={`review-step-code-${step.id}`}
              className="mb-2 text-sm font-semibold text-foreground"
            >
              {step.type === 'fix-code' ? 'Código inicial' : 'Código del ejercicio'}
            </h4>
            <CodeBlock
              code={step.code}
              language={step.language ?? 'javascript'}
              showLineNumbers={step.type === 'find-error'}
              highlightedLines={step.type === 'find-error' ? step.errorLines ?? [] : []}
            />
          </section>
        )}

        {hasAttempt ? (
          <section aria-labelledby={`review-step-answer-${step.id}`}>
            <h4
              id={`review-step-answer-${step.id}`}
              className="mb-2 text-sm font-semibold text-foreground"
            >
              {step.type === 'fix-code' ? 'Código enviado' : 'Tu respuesta'}
            </h4>
            <AnswerValue step={step} answer={attempt.answer} />
            {attempt.hintsUsed > 0 && (
              <p className="mt-3 text-sm text-muted-foreground">
                Pistas utilizadas: {attempt.hintsUsed}
              </p>
            )}
          </section>
        ) : (
          <p className="border-l-4 border-border pl-4 text-sm text-muted-foreground">
            Sin respuesta registrada
          </p>
        )}

        {step.explanation !== '' && (
          <section aria-labelledby={`review-step-explanation-${step.id}`}>
            <h4
              id={`review-step-explanation-${step.id}`}
              className="mb-2 text-sm font-semibold text-foreground"
            >
              Explicación
            </h4>
            <p className="text-sm leading-relaxed text-muted-foreground">{step.explanation}</p>
          </section>
        )}
      </div>
    </ExerciseCard>
  );
}
