import { Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';
import { DifficultyBadge } from '@/components/codegym/DifficultyBadge';
import type { ExerciseSession } from '@/types/exercise';
import type { UserAnswer } from '@/types/progress';
import { ConfettiLayer } from './ConfettiLayer';

const BUTTON =
  'inline-flex min-h-11 items-center justify-center rounded-md px-5 py-2.5 text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

export interface SessionCompleteCelebrationProps {
  session: ExerciseSession;
  answers: UserAnswer[];
}

/** Resumen visual del estado `isComplete`; usa únicamente datos ya persistidos. */
export function SessionCompleteCelebration({ session, answers }: SessionCompleteCelebrationProps) {
  const correct = answers.filter((answer) => answer.isCorrect).length;
  const completionEvent = `${session.id}:completed:${answers.length}`;

  return (
    <section aria-labelledby="session-complete-title" className="relative overflow-hidden rounded-2xl border border-primary/40 bg-card p-6 text-center shadow-[0_0_56px_hsl(var(--accent)/0.12)] sm:p-10">
      <ConfettiLayer eventId={completionEvent} mode="complete" />
      <div className="relative mx-auto flex max-w-lg flex-col items-center gap-5">
        <span className="flex size-16 items-center justify-center rounded-full bg-warning/15 text-warning shadow-[0_0_36px_hsl(var(--warning)/0.20)] animate-celebrate-check">
          <Trophy aria-hidden="true" className="size-8" />
        </span>
        <div className="space-y-2">
          <p className="text-sm font-medium text-success">Sesión finalizada</p>
          <h1 id="session-complete-title" className="text-2xl font-bold text-foreground sm:text-3xl">¡Sesión completada!</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">Has completado {correct} de {answers.length} pasos correctamente en {session.title}.</p>
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <DifficultyBadge difficulty={session.difficulty} />
          <span>{answers.length} pasos completados</span>
        </div>
        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <Link to={`/results/${session.id}`} className={`${BUTTON} bg-primary text-primary-foreground hover:bg-primary/90`}>Ver resultados</Link>
          <Link to={`/practice/${session.id}`} className={`${BUTTON} border border-border bg-card text-foreground hover:bg-accent`}>Seguir practicando</Link>
        </div>
      </div>
    </section>
  );
}
