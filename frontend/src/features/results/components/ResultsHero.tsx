import { Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ConfettiLayer } from '@/features/session/components/feedback/ConfettiLayer';
import type { CompletedSession } from '@/types/progress';

const PRIMARY =
  'inline-flex min-h-11 w-full items-center justify-center rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:w-auto';
const SECONDARY =
  'inline-flex min-h-11 w-full items-center justify-center rounded-md border border-border bg-card px-5 py-2.5 text-sm font-semibold text-foreground ring-offset-background transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:w-auto';

function copyFor(accuracy: number) {
  if (accuracy === 100) return { title: '¡Excelente trabajo!', message: 'Has completado esta sesión con todas las respuestas correctas.' };
  if (accuracy >= 80) return { title: '¡Muy buen trabajo!', message: 'Has consolidado gran parte de los ejercicios de esta sesión.' };
  if (accuracy >= 60) return { title: '¡Buen progreso!', message: 'Cada respuesta te acerca a dominar este concepto.' };
  return { title: 'Sigue practicando', message: 'Revisar tus respuestas es el siguiente paso para afianzar el concepto.' };
}

export interface ResultsHeroProps {
  completedSession: CompletedSession;
  sessionTitle: string;
  secondaryAction: { to: string; label: string };
}

export function ResultsHero({ completedSession, sessionTitle, secondaryAction }: ResultsHeroProps) {
  const copy = copyFor(completedSession.accuracy);

  return (
    <section aria-labelledby="results-title" className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-[0_0_48px_hsl(var(--primary)/0.08)] sm:p-10">
      <ConfettiLayer eventId={`results:${completedSession.id}`} mode="complete" />
      <div className="relative mx-auto flex max-w-2xl flex-col items-center text-center">
        <span className="flex size-16 items-center justify-center rounded-full bg-warning/15 text-warning shadow-[0_0_36px_hsl(var(--warning)/0.2)]">
          <Trophy aria-hidden="true" className="size-8" />
        </span>
        <p className="mt-5 text-sm font-semibold text-success">Sesión completada</p>
        <h1 id="results-title" className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">{copy.title}</h1>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">{copy.message}</p>
        <p className="mt-2 text-sm font-medium text-foreground">{sessionTitle}</p>
        <div className="mt-7 flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row">
          <Link to={`/practice/${completedSession.sessionId}`} className={PRIMARY}>Seguir practicando</Link>
          <Link to={secondaryAction.to} className={SECONDARY}>{secondaryAction.label}</Link>
        </div>
      </div>
    </section>
  );
}
