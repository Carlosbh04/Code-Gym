import { BarChart3, BookOpenCheck, CalendarDays, Clock3, Eye, Target } from 'lucide-react';
import { Link } from 'react-router-dom';

import { EmptyState } from '@/components/codegym/EmptyState';
import { formatDuration } from '@/features/dashboard/components/dashboard-formatters';
import type { Technology } from '@/types/content';
import type { CompletedSession } from '@/types/progress';
import type { TechnologySessionItem, TechnologyViewModel } from '../technology-page-model';

interface TechnologyResultsProps {
  technology: Technology;
  model: TechnologyViewModel;
}

export function TechnologyResults({ technology, model }: TechnologyResultsProps) {
  const results = model.sessions
    .flatMap((item) => item.completion.status === 'ready' && item.completion.completedSession !== null
      ? [{ item, completion: item.completion.completedSession }]
      : [])
    .sort((left, right) => right.completion.completedAt.localeCompare(left.completion.completedAt));
  const averageAccuracy = results.length === 0
    ? null
    : Math.round(results.reduce((total, result) => total + result.completion.accuracy, 0) / results.length);
  const totalTime = results.reduce((total, result) => total + result.completion.timeSpentMs, 0);

  return (
    <section aria-labelledby="results-heading" className="mt-3 sm:mt-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Historial guardado</p>
        <h2 id="results-heading" className="mt-1 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          Resultados de {technology.name}
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          Un resultado por cada sesión publicada que has completado.
        </p>
      </div>

      <div aria-label={`Resumen de resultados en ${technology.name}`} className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={BookOpenCheck} label="Resultados guardados" value={String(results.length)} />
        <Metric icon={Target} label="Precisión media" value={averageAccuracy === null ? '—' : `${averageAccuracy}%`} />
        <Metric icon={BarChart3} label="Conceptos practicados" value={`${model.practicedConcepts} / ${model.totalConcepts}`} />
        <Metric icon={Clock3} label="Tiempo registrado" value={results.length === 0 ? '—' : formatDuration(totalTime)} />
      </div>

      {model.completionErrors > 0 ? (
        <p role="alert" className="mt-4 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          No se pudo consultar el resultado de {model.completionErrors} {model.completionErrors === 1 ? 'sesión' : 'sesiones'}. Los datos visibles sí están verificados.
        </p>
      ) : null}

      {results.length === 0 ? (
        <EmptyState
          icon={BarChart3}
          title={model.completionErrors > 0 ? 'No pudimos cargar resultados verificables' : `Todavía no tienes resultados de ${technology.name}`}
          description={model.completionErrors > 0
            ? 'Vuelve a intentarlo para consultar el historial de esta tecnología.'
            : 'Completa una sesión publicada para que su resultado aparezca aquí.'}
          action={model.completionErrors > 0 ? undefined : (
            <Link to={`/tech/${technology.id}?tab=exercises`} className="inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              Explorar ejercicios
            </Link>
          )}
          className="mt-4 rounded-2xl border border-border bg-card"
        />
      ) : (
        <ul aria-label="Resultados guardados" className="mt-4 space-y-3">
          {results.map(({ item, completion }) => (
            <ResultRow key={completion.id} item={item} completion={completion} />
          ))}
        </ul>
      )}
    </section>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof BarChart3; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className="size-4 text-primary" aria-hidden="true" />
        {label}
      </div>
      <p className="mt-3 text-2xl font-bold tabular-nums text-foreground">{value}</p>
    </div>
  );
}

function ResultRow({ item, completion }: { item: TechnologySessionItem; completion: CompletedSession }) {
  return (
    <li>
      <article className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">{item.topic.name}</p>
            <h3 className="mt-1 whitespace-normal text-base font-semibold leading-snug text-foreground sm:text-lg">{item.session.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{item.concept.name}</p>
            <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm">
              <ResultDatum label="Aciertos" value={`${completion.correctSteps}/${completion.totalSteps}`} />
              <ResultDatum label="Precisión" value={`${Math.round(completion.accuracy)}%`} />
              <ResultDatum label="Duración" value={formatDuration(completion.timeSpentMs)} />
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <CalendarDays className="size-4 text-primary" aria-hidden="true" />
                <dt className="sr-only">Fecha</dt>
                <dd>{formatCompletedDate(completion.completedAt)}</dd>
              </div>
            </dl>
          </div>
          <div className="grid w-full gap-2 sm:grid-cols-2 lg:w-auto">
            <Link to={`/results/${item.session.id}`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              Ver resultado<BarChart3 className="size-4" aria-hidden="true" />
            </Link>
            <Link to={`/review/${item.session.id}`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border px-4 text-sm font-semibold text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              Revisar< Eye className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </article>
    </li>
  );
}

function ResultDatum({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-semibold tabular-nums text-foreground">{value}</dd>
    </div>
  );
}

function formatCompletedDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Fecha no disponible'
    : new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium' }).format(date);
}
