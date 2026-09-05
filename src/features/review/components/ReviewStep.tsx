import { CircleCheck, CircleX } from 'lucide-react';
import { CodeBlock } from '@/components/codegym/CodeBlock';
import { ExerciseCard } from '@/components/codegym/ExerciseCard';
import type { ExerciseStep, FindErrorAnswer } from '@/types/exercise';
import type { Attempt } from '@/types/progress';
import { cn } from '@/lib/utils';

export interface ReviewStepProps {
  step: ExerciseStep;
  attempt: Attempt | undefined;
  position: number;
}

function isFindErrorAnswer(answer: unknown): answer is FindErrorAnswer {
  return typeof answer === 'object' && answer !== null && 'line' in answer && typeof answer.line === 'number' && 'errorType' in answer && typeof answer.errorType === 'string';
}

function optionText(step: ExerciseStep, answer: unknown): string | null {
  if (typeof answer !== 'string' && typeof answer !== 'number') return null;
  return step.options?.find((option) => option.id === String(answer))?.text ?? String(answer);
}

function AnswerValue({ step, answer }: { step: ExerciseStep; answer: unknown }) {
  if (step.type === 'find-error' && isFindErrorAnswer(answer)) {
    return <dl className="grid gap-3 text-sm sm:grid-cols-2"><div><dt className="text-muted-foreground">Línea seleccionada</dt><dd className="mt-1 font-medium text-foreground">Línea {answer.line}</dd></div><div><dt className="text-muted-foreground">Tipo seleccionado</dt><dd className="mt-1 font-medium text-foreground">{answer.errorType}</dd></div></dl>;
  }
  if (step.type === 'fix-code' && typeof answer === 'string') return <CodeBlock code={answer} language={step.language ?? 'javascript'} />;
  const text = optionText(step, answer);
  return text === null ? <p className="text-sm text-muted-foreground">La respuesta registrada no tiene un formato compatible para mostrarla.</p> : <p className="break-words text-sm font-medium text-foreground">{text}</p>;
}

function CorrectAnswer({ step }: { step: ExerciseStep }) {
  const correctOptions = step.options?.filter((option) => option.correct) ?? [];
  if (correctOptions.length > 0) return <ul className="space-y-1 text-sm font-medium text-foreground">{correctOptions.map((option) => <li key={option.id}>{option.text}</li>)}</ul>;
  if (step.type === 'find-error' && (step.errorLines?.length ?? 0) > 0 && step.errorType !== null) {
    return <dl className="grid gap-3 text-sm sm:grid-cols-2"><div><dt className="text-muted-foreground">Línea relevante</dt><dd className="mt-1 font-medium text-foreground">{(step.errorLines ?? []).map((line) => `Línea ${line}`).join(', ')}</dd></div><div><dt className="text-muted-foreground">Tipo de error</dt><dd className="mt-1 font-medium text-foreground">{step.errorType}</dd></div></dl>;
  }
  return null;
}

function OptionReview({ step, answer }: { step: ExerciseStep; answer: unknown }) {
  if ((step.options?.length ?? 0) === 0) return null;
  const selectedId = typeof answer === 'string' || typeof answer === 'number' ? String(answer) : null;
  return <section aria-labelledby={`review-step-options-${step.id}`}><h4 id={`review-step-options-${step.id}`} className="mb-2 text-sm font-semibold text-foreground">Opciones</h4><ol className="space-y-2">{step.options?.map((option, index) => {
    const selected = option.id === selectedId;
    const labels = [selected ? 'Tu respuesta' : null, option.correct ? 'Respuesta correcta' : null].filter(Boolean);
    return <li key={option.id} className={cn('flex min-h-11 items-center gap-3 rounded-xl border p-3 text-sm', option.correct ? 'border-success/40 bg-success/10' : selected ? 'border-destructive/40 bg-destructive/10' : 'border-border bg-background/30')}><span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-bold text-foreground">{String.fromCharCode(65 + index)}</span><span className="min-w-0 flex-1 break-words font-medium text-foreground">{option.text}</span>{option.correct && <CircleCheck aria-hidden="true" className="size-4 shrink-0 text-success" />}{selected && !option.correct && <CircleX aria-hidden="true" className="size-4 shrink-0 text-destructive" />} {labels.length > 0 && <span className="sr-only">{labels.join(' · ')}</span>}<span className="sr-only">{option.correct ? ' Opción correcta.' : ''}{selected ? ' Tu respuesta.' : ''}</span></li>;
  })}</ol></section>;
}

/** Lectura de un step persistido: no revalida ni vuelve a ejecutar código. */
export function ReviewStep({ step, attempt, position }: ReviewStepProps) {
  const hasAttempt = attempt !== undefined;
  const hasCorrectAnswer = (step.options?.some((option) => option.correct) ?? false) || (step.type === 'find-error' && (step.errorLines?.length ?? 0) > 0 && step.errorType !== null);

  return <ExerciseCard state={hasAttempt ? 'answered' : 'default'}><div className="flex min-w-0 flex-col gap-5"><header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><p className="font-mono text-xs uppercase tracking-wide text-muted-foreground">Pregunta {position}</p><h2 className="mt-2 text-xl font-bold leading-snug text-foreground sm:text-2xl">{step.prompt}</h2></div>{hasAttempt && <p className={cn('inline-flex shrink-0 items-center gap-2 self-start rounded-full border px-3 py-1.5 text-sm font-semibold', attempt.isCorrect ? 'border-success/40 bg-success/10 text-success' : 'border-destructive/40 bg-destructive/10 text-destructive')}>{attempt.isCorrect ? <CircleCheck aria-hidden="true" className="size-4" /> : <CircleX aria-hidden="true" className="size-4" />}{attempt.isCorrect ? 'Respuesta correcta' : 'Respuesta incorrecta'}</p>}</header>
    {step.code !== null && <section aria-labelledby={`review-step-code-${step.id}`}><h3 id={`review-step-code-${step.id}`} className="mb-2 text-sm font-semibold text-foreground">{step.type === 'fix-code' ? 'Código inicial' : 'Código del ejercicio'}</h3><CodeBlock code={step.code} language={step.language ?? 'javascript'} showLineNumbers={step.type === 'find-error'} highlightedLines={step.type === 'find-error' ? step.errorLines ?? [] : []} /></section>}
    {hasAttempt ? <><section aria-labelledby={`review-step-answer-${step.id}`} className={cn('rounded-xl border p-4', attempt.isCorrect ? 'border-success/30 bg-success/5' : 'border-destructive/30 bg-destructive/5')}><h3 id={`review-step-answer-${step.id}`} className="mb-3 text-sm font-semibold text-foreground">{step.type === 'fix-code' ? 'Código enviado' : 'Tu respuesta'}</h3><AnswerValue step={step} answer={attempt.answer} />{attempt.hintsUsed > 0 && <p className="mt-3 text-sm text-muted-foreground">Pistas utilizadas: {attempt.hintsUsed}</p>}</section><OptionReview step={step} answer={attempt.answer} /></> : <p className="rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">Sin respuesta registrada.</p>}
    {hasCorrectAnswer && <section aria-labelledby={`review-step-correct-${step.id}`} className="rounded-xl border border-success/30 bg-success/5 p-4"><h3 id={`review-step-correct-${step.id}`} className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground"><CircleCheck aria-hidden="true" className="size-4 text-success" />Respuesta correcta</h3><CorrectAnswer step={step} /></section>}
    {step.explanation !== '' && <section aria-labelledby={`review-step-explanation-${step.id}`} className="rounded-xl border border-primary/20 bg-primary/5 p-4"><h3 id={`review-step-explanation-${step.id}`} className="mb-2 text-sm font-semibold text-foreground">Explicación</h3><p className="text-sm leading-relaxed text-muted-foreground">{step.explanation}</p></section>}
  </div></ExerciseCard>;
}
