import { ChevronRight, CircleCheck, CircleX } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { ExerciseSession } from '@/types/exercise';
import type { HistoryAttempt } from '@/types/history';

export interface AnswerReviewListProps {
  session: ExerciseSession;
  attempts: HistoryAttempt[] | null;
  error: string | null;
}

export function AnswerReviewList({ session, attempts, error }: AnswerReviewListProps) {
  const attemptsByStep = new Map(attempts?.map((attempt) => [attempt.stepId, attempt]));

  return (
    <section aria-labelledby="answer-review-title" className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sesión</p><h2 id="answer-review-title" className="mt-1 text-xl font-bold text-foreground">Revisión de respuestas</h2></div>
        <Link to={`/review/${session.id}`} className="inline-flex min-h-11 items-center rounded-md px-3 text-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Revisar respuestas</Link>
      </div>
      {attempts === null ? <p role="status" className="mt-5 text-sm text-muted-foreground">Cargando respuestas…</p>
        : error !== null ? <p role="alert" className="mt-5 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">No se pudieron cargar las respuestas. {error}</p>
          : <ol className="mt-5 flex flex-col gap-2">
            {session.steps.map((step, index) => {
              const attempt = attemptsByStep.get(step.id);
              const correct = attempt?.isCorrect;
              return <li key={step.id}><Link to={`/review/${session.id}`} aria-label={`Revisar respuesta ${index + 1}: ${step.prompt}`} className="flex min-h-11 items-center gap-3 rounded-xl border border-border bg-background/30 p-3 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-sm font-semibold text-foreground">{index + 1}</span><span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{step.prompt}</span>{correct === true ? <span className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-success"><CircleCheck aria-hidden="true" className="size-4" />Correcta</span> : correct === false ? <span className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-destructive"><CircleX aria-hidden="true" className="size-4" />Incorrecta</span> : <span className="shrink-0 text-sm text-muted-foreground">Sin dato</span>}<ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" /></Link></li>;
            })}
          </ol>}
    </section>
  );
}
