import { ArrowRight, ListChecks } from 'lucide-react';
import { Link } from 'react-router-dom';

import { DifficultyBadge } from '@/components/codegym/DifficultyBadge';
import type { Concept } from '@/types/content';
import type { ExerciseSession } from '@/types/exercise';
import type { ConceptProgress } from '@/types/progress';

export type TopicSessionResult =
  | { status: 'success'; sessions: ExerciseSession[] }
  | { status: 'error'; message: string };

interface TopicSessionListProps {
  concepts: Concept[];
  results: Readonly<Record<string, TopicSessionResult>>;
  progress: ReadonlyMap<string, ConceptProgress>;
}

export function TopicSessionList({ concepts, results, progress }: TopicSessionListProps) {
  return (
    <section
      aria-labelledby="practice-heading"
      className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5"
    >
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary" aria-hidden="true">
          <ListChecks className="size-5" />
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Práctica</p>
          <h2 id="practice-heading" className="mt-1 text-xl font-bold tracking-tight text-foreground">
            Sesiones disponibles
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Aplica lo que acabas de repasar en ejercicios guiados.
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-5">
        {concepts.map((concept) => (
          <ConceptSessions
            key={concept.id}
            concept={concept}
            result={results[concept.id]}
            progress={progress.get(concept.id)}
          />
        ))}
      </div>
    </section>
  );
}

function ConceptSessions({
  concept,
  result,
  progress,
}: {
  concept: Concept;
  result: TopicSessionResult | undefined;
  progress: ConceptProgress | undefined;
}) {
  return (
    <section aria-labelledby={`sessions-${concept.id}`} className="border-t border-border pt-5 first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p id={`sessions-${concept.id}`} className="text-sm font-semibold text-foreground">
          {concept.name}
        </p>
        {progress !== undefined && progress.totalAttempts > 0 ? (
          <p className="text-xs text-muted-foreground">{progress.totalAttempts} {progress.totalAttempts === 1 ? 'intento' : 'intentos'}</p>
        ) : null}
      </div>

      {result === undefined ? (
        <p role="status" className="mt-3 text-sm text-muted-foreground">Cargando sesiones…</p>
      ) : result.status === 'error' ? (
        <p role="alert" className="mt-3 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          No pudimos cargar las sesiones. {result.message}
        </p>
      ) : result.sessions.length === 0 ? (
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">No hay sesiones disponibles todavía.</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {result.sessions.map((session) => <TopicSessionCard key={session.id} session={session} />)}
        </ul>
      )}
    </section>
  );
}

function TopicSessionCard({ session }: { session: ExerciseSession }) {
  const stepLabel = session.steps.length === 1 ? 'ejercicio' : 'ejercicios';

  return (
    <li>
      <Link
        to={`/practice/${session.id}`}
        className="group flex min-h-11 flex-col gap-3 rounded-xl border border-border bg-background p-4 transition-all duration-fast hover:-translate-y-0.5 hover:border-primary/60 hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:flex-row sm:items-center sm:justify-between"
      >
        <span className="min-w-0">
          <span className="block break-words font-semibold text-foreground">{session.title}</span>
          <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
            <DifficultyBadge difficulty={session.difficulty} />
            <span className="text-sm text-muted-foreground">{session.steps.length} {stepLabel}</span>
          </span>
        </span>
        <span className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground transition-colors group-hover:bg-primary/90 sm:min-w-36">
          Empezar práctica
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
        </span>
      </Link>
    </li>
  );
}
