import { ArrowRight, CalendarDays, Layers3, Target } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Skeleton } from '@/components/codegym/Skeleton';
import { TechnologyIcon } from '@/components/codegym/TechnologyIcon';
import { cn } from '@/lib/utils';
import { formatDate, formatRelativeDate } from './dashboard-formatters';
import type { TechnologyProgress } from './dashboard-types';

interface TechnologyAccent {
  icon: string;
  percentage: string;
  progress: string;
}

const DEFAULT_ACCENT: TechnologyAccent = {
  icon: 'border-primary/20 bg-primary/10',
  percentage: 'text-primary',
  progress: 'bg-primary',
};

const TECHNOLOGY_ACCENTS: Readonly<Record<string, TechnologyAccent>> = {
  javascript: {
    icon: 'border-amber-500/25 bg-amber-500/10',
    percentage: 'text-amber-600 dark:text-amber-400',
    progress: 'bg-amber-500',
  },
  html: {
    icon: 'border-orange-500/25 bg-orange-500/10',
    percentage: 'text-orange-600 dark:text-orange-400',
    progress: 'bg-orange-500',
  },
  css: {
    icon: 'border-sky-500/25 bg-sky-500/10',
    percentage: 'text-sky-600 dark:text-sky-400',
    progress: 'bg-sky-500',
  },
  react: {
    icon: 'border-cyan-500/25 bg-cyan-500/10',
    percentage: 'text-cyan-600 dark:text-cyan-400',
    progress: 'bg-cyan-500',
  },
  node: {
    icon: 'border-emerald-500/25 bg-emerald-500/10',
    percentage: 'text-emerald-600 dark:text-emerald-400',
    progress: 'bg-emerald-500',
  },
  nodejs: {
    icon: 'border-emerald-500/25 bg-emerald-500/10',
    percentage: 'text-emerald-600 dark:text-emerald-400',
    progress: 'bg-emerald-500',
  },
  sql: {
    icon: 'border-violet-500/25 bg-violet-500/10',
    percentage: 'text-violet-600 dark:text-violet-400',
    progress: 'bg-violet-500',
  },
};

export function TechnologyProgressList({
  items,
  isLoading,
  error,
}: {
  items: TechnologyProgress[];
  isLoading: boolean;
  error: string | null;
}) {
  return (
    <section aria-labelledby="technology-progress-title" className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary" aria-hidden="true"><Layers3 className="size-5" /></span>
          <div>
            <h2 id="technology-progress-title" className="text-xl font-bold text-foreground">Progreso por tecnología</h2>
            <p className="mt-1 text-sm text-muted-foreground">Explora tus avances en cada tecnología.</p>
          </div>
        </div>
        <Link to="/tech" className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-primary transition-colors hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          Ver todas las tecnologías<ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
      {isLoading ? (
        <div
          aria-hidden="true"
          className="mt-5 grid items-stretch gap-4 sm:grid-cols-2 min-[1400px]:grid-cols-3"
        >
          {Array.from(
            { length: 3 },
            (_, index) => (
              <div
                key={index}
                className="flex min-h-[17rem] min-w-0 flex-col rounded-xl border border-border bg-background/55 p-4 sm:p-5"
              >
                <div className="flex items-start gap-3">
                  <Skeleton className="size-11 shrink-0 rounded-xl" />

                  <div className="min-w-0 flex-1">
                    <Skeleton className="h-5 w-28" />
                    <Skeleton className="mt-2 h-3 w-24" />
                  </div>

                  <Skeleton className="h-6 w-12" />
                </div>

                <Skeleton className="mt-5 h-2.5 w-full rounded-full" />

                <div className="mt-5 grid grid-cols-2 border-y border-border/80 py-4">
                  <div className="flex min-w-0 items-start gap-2.5 pr-3">
                    <Skeleton className="mt-0.5 size-4 shrink-0 rounded-md" />

                    <div className="min-w-0">
                      <Skeleton className="h-3 w-16" />
                      <Skeleton className="mt-2 h-4 w-12" />
                    </div>
                  </div>

                  <div className="flex min-w-0 items-start gap-2.5 border-l border-border/80 pl-3">
                    <Skeleton className="mt-0.5 size-4 shrink-0 rounded-md" />

                    <div className="min-w-0">
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="mt-2 h-4 w-16" />
                    </div>
                  </div>
                </div>

                <Skeleton className="mt-auto h-11 w-full rounded-lg" />
              </div>
            ),
          )}
        </div>
      )
        : error !== null ? <p role="alert" className="mt-5 text-sm text-destructive">No pudimos cargar el progreso por tecnología: {error}</p>
          : items.length === 0 ? <p className="mt-5 text-sm text-muted-foreground">No hay tecnologías con conceptos disponibles.</p>
            : <ul className="mt-5 grid items-stretch gap-4 sm:grid-cols-2 min-[1400px]:grid-cols-3">{items.map((item) => <TechnologyProgressCard key={item.technology.id} item={item} />)}</ul>}
    </section>
  );
}

function TechnologyProgressCard({ item }: { item: TechnologyProgress }) {
  const percentage = item.totalConcepts === 0 ? 0 : Math.round((item.practicedConcepts / item.totalConcepts) * 100);
  const accent = TECHNOLOGY_ACCENTS[item.technology.id.toLocaleLowerCase('en-US')] ?? DEFAULT_ACCENT;
  return (
    <li className="flex min-h-[17rem] min-w-0 flex-col rounded-xl border border-border bg-background/55 p-4 transition-colors hover:border-primary/25 sm:p-5">
      <div className="flex min-w-0 items-start gap-3">
        <TechnologyIcon technologyId={item.technology.id} technologyName={item.technology.name} fallback={item.technology.icon} className={cn('size-11 rounded-xl', accent.icon)} imageClassName="size-[82%]" />
        <div className="min-w-0 flex-1">
          <h3 className="break-words text-base font-semibold leading-tight text-foreground">{item.technology.name}</h3>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.practicedConcepts} de {item.totalConcepts} conceptos</p>
        </div>
        <span className={cn('shrink-0 text-lg font-bold tabular-nums', accent.percentage)}>{percentage}%</span>
      </div>
      <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label={`Progreso en ${item.technology.name}`} aria-valuemin={0} aria-valuemax={item.totalConcepts} aria-valuenow={item.practicedConcepts} aria-valuetext={`${item.practicedConcepts} de ${item.totalConcepts} conceptos practicados`}>
        <div className={cn('h-full rounded-full transition-[width] duration-slow ease-standard', accent.progress)} style={{ width: `${percentage}%` }} />
      </div>

      <dl className="mt-5 grid grid-cols-2 border-y border-border/80 py-4">
        <div className="flex min-w-0 items-start gap-2.5 pr-3">
          <Target className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <div className="min-w-0">
            <dt className="text-xs leading-tight text-muted-foreground">Precisión</dt>
            <dd className="mt-1 text-sm font-semibold tabular-nums text-foreground">{item.accuracy === undefined ? 'Sin datos' : `${item.accuracy}%`}</dd>
          </div>
        </div>
        <div className="flex min-w-0 items-start gap-2.5 border-l border-border/80 pl-3">
          <CalendarDays className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <div className="min-w-0">
            <dt className="text-xs leading-tight text-muted-foreground">Última práctica</dt>
            <dd className="mt-1 text-sm font-semibold leading-tight text-foreground">
              {item.lastPracticedAt === undefined ? 'Sin práctica' : (
                <time dateTime={item.lastPracticedAt} title={formatDate(item.lastPracticedAt)}>{formatRelativeDate(item.lastPracticedAt)}</time>
              )}
            </dd>
          </div>
        </div>
      </dl>

      <Link to={`/tech/${item.technology.id}`} className="mt-auto inline-flex min-h-11 w-full items-center justify-between gap-3 rounded-lg border border-primary/15 bg-primary/[0.07] px-4 py-2.5 text-sm font-semibold text-primary transition-colors hover:border-primary/25 hover:bg-primary/[0.12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"><span>Ver tecnología</span><ArrowRight className="size-4 shrink-0" aria-hidden="true" /></Link>
    </li>
  );
}
