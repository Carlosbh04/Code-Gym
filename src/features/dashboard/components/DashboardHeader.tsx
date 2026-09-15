import { ArrowUpRight, ChartNoAxesCombined, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDate } from './dashboard-formatters';
import type { DashboardActivity } from './dashboard-types';

export function DashboardHeader({ latestActivity }: { latestActivity?: DashboardActivity }) {
  return (
    <header className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6 lg:p-7">
      <div className="pointer-events-none absolute -left-20 top-1/2 size-56 -translate-y-1/2 rounded-full bg-primary/5 blur-3xl" aria-hidden="true" />
      <div className="relative grid items-stretch gap-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(20rem,0.8fr)]">
        <div className="flex min-w-0 items-center gap-4 sm:gap-5">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary sm:size-14" aria-hidden="true">
            <ChartNoAxesCombined className="size-6 sm:size-7" />
          </span>
          <div className="min-w-0">
            <h1 id="dashboard-title" className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Progreso
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              Tu avance en CodeGym. Sigue practicando para dominar más conceptos.
            </p>
          </div>
        </div>

        {latestActivity ? (
          <Link
            to={`/results/${latestActivity.completedSession.sessionId}`}
            aria-label={`Ver resultado de la última práctica: ${latestActivity.sessionTitle}`}
            className="group grid min-h-28 min-w-0 grid-cols-[5rem_minmax(0,1fr)_2.5rem] items-center gap-3 rounded-xl border border-primary/15 bg-background/45 p-3 transition-colors hover:border-primary/30 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <MiniProgressGraphic />
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Última práctica</p>
              <p className="mt-1 truncate font-semibold text-foreground">{latestActivity.sessionTitle}</p>
              <time dateTime={latestActivity.completedSession.completedAt} className="mt-1 block text-xs text-muted-foreground">
                {formatDate(latestActivity.completedSession.completedAt)}
              </time>
            </div>
            <span className="flex size-10 items-center justify-center rounded-lg text-primary transition-colors group-hover:bg-primary/10" aria-hidden="true">
              <ArrowUpRight className="size-5" />
            </span>
          </Link>
        ) : (
          <div className="grid min-h-28 min-w-0 grid-cols-[5rem_minmax(0,1fr)] items-center gap-3 rounded-xl border border-border bg-background/35 p-3">
            <MiniProgressGraphic />
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Última práctica</p>
              <p className="mt-1 text-sm font-medium leading-relaxed text-muted-foreground">Aún no hay sesiones completadas.</p>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

function MiniProgressGraphic() {
  return (
    <span className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-primary/15 bg-primary/5 text-primary" aria-hidden="true">
      <svg viewBox="0 0 80 80" className="absolute inset-0 size-full" fill="none">
        <path d="M8 62 25 44l12 10 16-25 19 20v20H8Z" fill="currentColor" fillOpacity=".08" />
        <path d="m8 62 17-18 12 10 16-25 19 20" stroke="currentColor" strokeOpacity=".62" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <TrendingUp className="relative size-5" />
    </span>
  );
}
