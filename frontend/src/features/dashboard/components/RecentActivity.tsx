import { ArrowUpRight, CheckCircle2, Clock3 } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Skeleton } from '@/components/codegym/Skeleton';
import { formatDate, formatDuration } from './dashboard-formatters';
import type { DashboardActivity } from './dashboard-types';

export interface RecentActivityProps {
  activities: DashboardActivity[];
  isLoading: boolean;
  error: string | null;
}

export function RecentActivity({ activities, isLoading, error }: RecentActivityProps) {
  return (
    <section aria-labelledby="recent-activity-title" className="min-h-full rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div>
        <h2 id="recent-activity-title" className="text-xl font-bold text-foreground">Actividad reciente</h2>
        <p className="mt-1 text-sm text-muted-foreground">Tus últimas sesiones de práctica.</p>
      </div>
      {isLoading ? (
        <div
          aria-hidden="true"
          className="mt-4 divide-y divide-border border-y border-border"
        >
          {Array.from(
            { length: 3 },
            (_, index) => (
              <div
                key={index}
                className="grid gap-3 py-3.5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
              >
                <div className="min-w-0">
                  <Skeleton className="h-5 w-4/5" />
                  <Skeleton className="mt-2 h-4 w-3/5" />

                  <div className="mt-3 flex gap-4">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4 sm:justify-end">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-10" />
                    <Skeleton className="h-3 w-20" />
                  </div>

                  <Skeleton className="size-11 rounded-lg" />
                </div>
              </div>
            ),
          )}
        </div>
      )
        : error ? <p role="alert" className="mt-5 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">No se pudo cargar la actividad reciente: {error}</p>
          : activities.length === 0 ? <p className="mt-5 text-sm text-muted-foreground">Aún no has completado sesiones.</p>
            : <ul className="mt-4 divide-y divide-border border-y border-border">{activities.map((activity) => <ActivityRow key={activity.completedSession.id} activity={activity} />)}</ul>}
    </section>
  );
}

function ActivityRow({ activity }: { activity: DashboardActivity }) {
  const { completedSession } = activity;
  return (
    <li className="grid min-w-0 gap-3 py-3.5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div className="min-w-0"><div className="flex min-w-0 items-center gap-2"><CheckCircle2 className="size-4 shrink-0 text-success" aria-hidden="true" /><p className="truncate font-semibold text-foreground">{activity.sessionTitle}</p></div><p className="mt-1 break-words text-sm text-muted-foreground">{activity.technologyName}{activity.topicName ? ` · ${activity.topicName}` : ''}</p><div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground"><span>{completedSession.correctSteps}/{completedSession.totalSteps} aciertos</span><span className="inline-flex items-center gap-1"><Clock3 className="size-3.5" aria-hidden="true" />{formatDuration(completedSession.timeSpentMs)}</span></div></div>
      <div className="flex items-center justify-between gap-4 sm:justify-end"><div className="text-right"><p className="font-semibold text-foreground">{Math.round(completedSession.accuracy)}%</p><time dateTime={completedSession.completedAt} className="text-xs text-muted-foreground">{formatDate(completedSession.completedAt)}</time></div><Link to={`/results/${completedSession.sessionId}`} aria-label={`Ver resultado de ${activity.sessionTitle}`} className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"><ArrowUpRight className="size-5" aria-hidden="true" /></Link></div>
    </li>
  );
}
