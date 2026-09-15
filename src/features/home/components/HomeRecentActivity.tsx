import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  FileText,
} from 'lucide-react';
import { Link } from 'react-router-dom';

import { TechnologyIcon } from '@/components/codegym/TechnologyIcon';
import {
  formatDate,
  formatDuration,
  formatRelativeDate,
} from '@/features/dashboard/components/dashboard-formatters';

import type { HomeActivity } from '../home-types';

export function HomeRecentActivity({
  activities,
  isLoading,
  error,
  variant = 'default',
}: {
  activities: HomeActivity[];
  isLoading: boolean;
  error: string | null;
  variant?: 'default' | 'advanced';
}) {
  if (variant === 'advanced') {
    return (
      <section
        aria-labelledby="home-activity-title"
        className="min-w-0 rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
              <Clock3
                className="size-5"
                aria-hidden="true"
              />
            </div>

            <div className="min-w-0">
              <h2
                id="home-activity-title"
                className="text-lg font-bold tracking-tight text-foreground"
              >
                Actividad reciente
              </h2>

              <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
                Tus últimas prácticas y ejercicios completados.
              </p>
            </div>
          </div>

          {activities.length > 0 ? (
            <Link
              to="/dashboard"
              className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Ver todas
              <ArrowRight
                className="size-4"
                aria-hidden="true"
              />
            </Link>
          ) : null}
        </div>

        {isLoading ? (
          <p
            role="status"
            className="mt-5 text-sm text-muted-foreground"
          >
            Cargando actividad…
          </p>
        ) : error !== null ? (
          <p
            role="alert"
            className="mt-5 text-sm text-destructive"
          >
            No se pudo cargar la actividad reciente.
          </p>
        ) : activities.length === 0 ? (
          <p className="mt-5 text-sm text-muted-foreground">
            Tu actividad aparecerá aquí cuando completes una sesión.
          </p>
        ) : (
          <ul className="mt-4 space-y-2.5">
            {activities
              .slice(0, 4)
              .map((activity) => (
                <li
                  key={activity.completedSession.id}
                  className="rounded-xl border border-border bg-background/30 p-3 sm:p-3.5"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <TechnologyIcon
                      technologyId={activity.technologyId}
                      technologyName={activity.technologyName}
                      className="size-11 shrink-0 rounded-xl"
                    />

                    <div className="min-w-0 flex-1">
                      <p className="break-words text-sm font-bold leading-snug text-foreground sm:text-[15px]">
                        {activity.sessionTitle}
                      </p>

                      <p className="mt-0.5 break-words text-xs leading-relaxed text-muted-foreground">
                        {activity.technologyName}
                        {activity.topicName
                          ? ` · ${activity.topicName}`
                          : ''}
                      </p>

                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-400/15 bg-emerald-400/10 px-2 py-1 font-semibold text-emerald-400">
                          <CheckCircle2
                            className="size-3.5"
                            aria-hidden="true"
                          />
                          Completado
                        </span>

                        <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                          <FileText
                            className="size-3.5"
                            aria-hidden="true"
                          />
                          {activity.completedSession.totalSteps}{' '}
                          {activity.completedSession.totalSteps === 1
                            ? 'ejercicio'
                            : 'ejercicios'}
                        </span>

                        <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                          <Clock3
                            className="size-3.5"
                            aria-hidden="true"
                          />
                          {formatRelativeDate(
                            activity.completedSession.completedAt,
                          )}
                        </span>
                      </div>
                    </div>

                    <Link
                      to={`/results/${activity.completedSession.sessionId}`}
                      aria-label={activity.sessionTitle}
                      className="inline-flex min-h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-primary/25 bg-primary/5 px-3 text-xs font-semibold text-primary transition-colors hover:border-primary/45 hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      Revisar
                      <ArrowRight
                        className="size-3.5"
                        aria-hidden="true"
                      />
                    </Link>
                  </div>
                </li>
              ))}
          </ul>
        )}
      </section>
    );
  }

  return (
    <section
      aria-labelledby="home-activity-title"
      className="rounded-2xl border border-border bg-card p-5 shadow-sm"
    >
      <div className="flex items-center justify-between gap-3">
        <h2
          id="home-activity-title"
          className="text-xl font-bold text-foreground"
        >
          Actividad reciente
        </h2>

        {activities.length > 0 ? (
          <Link
            to="/dashboard"
            className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-lg px-1 text-sm font-semibold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Ver todas

            <ArrowRight
              className="size-4"
              aria-hidden="true"
            />
          </Link>
        ) : null}
      </div>

      {isLoading ? (
        <p
          role="status"
          className="mt-4 text-sm text-muted-foreground"
        >
          Cargando actividad…
        </p>
      ) : error !== null ? (
        <p
          role="alert"
          className="mt-4 text-sm text-destructive"
        >
          No se pudo cargar la actividad reciente.
        </p>
      ) : activities.length === 0 ? (
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Tu actividad aparecerá aquí cuando completes una sesión.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-border">
          {activities
            .slice(0, 3)
            .map((activity) => (
              <li
                key={
                  activity
                    .completedSession
                    .id
                }
                className="py-3"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <CheckCircle2
                    className="mt-0.5 size-4 shrink-0 text-success"
                    aria-hidden="true"
                  />

                  <div className="min-w-0 flex-1">
                    <Link
                      to={`/results/${activity.completedSession.sessionId}`}
                      className="block break-words text-sm font-semibold text-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {
                        activity
                          .sessionTitle
                      }
                    </Link>

                    <p className="mt-1 break-words text-xs text-muted-foreground">
                      {
                        activity
                          .technologyName
                      }

                      {activity.topicName
                        ? ` · ${activity.topicName}`
                        : ''}
                    </p>

                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span>
                        {Math.round(
                          activity
                            .completedSession
                            .accuracy,
                        )}
                        % de precisión
                      </span>

                      <span className="inline-flex items-center gap-1">
                        <Clock3
                          className="size-3"
                          aria-hidden="true"
                        />

                        {formatDuration(
                          activity
                            .completedSession
                            .timeSpentMs,
                        )}
                      </span>

                      <time
                        dateTime={
                          activity
                            .completedSession
                            .completedAt
                        }
                        title={formatDate(
                          activity
                            .completedSession
                            .completedAt,
                        )}
                      >
                        {formatDate(
                          activity
                            .completedSession
                            .completedAt,
                        )}
                      </time>
                    </div>
                  </div>
                </div>
              </li>
            ))}
        </ul>
      )}
    </section>
  );
}
