import {
  ArrowUpRight,
  CircleDashed,
  Clock3,
  FileText,
  Target,
  TrendingUp,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export function HomeProgressSummary({
  practicedConcepts,
  totalConcepts,
  hasActivity,
  isLoading,
  variant = 'default',
  globalAccuracy,
  recentSessions = 0,
}: {
  practicedConcepts: number;
  totalConcepts: number;
  hasActivity: boolean;
  isLoading: boolean;
  variant?: 'default' | 'advanced';
  globalAccuracy?: number;
  recentSessions?: number;
}) {
  const percentage =
    totalConcepts === 0
      ? 0
      : Math.round(
          (
            practicedConcepts
            / totalConcepts
          ) * 100,
        );

  if (variant === 'advanced') {
    const circumference =
      2 * Math.PI * 52;

    const progressOffset =
      circumference
      * (1 - percentage / 100);

    return (
      <section
        aria-labelledby="home-progress-title"
        className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5 xl:min-h-[238px]"
      >
        <div className="flex items-center justify-between gap-3">
          <h2
            id="home-progress-title"
            className="text-lg font-bold text-foreground"
          >
            Tu progreso
          </h2>

          <Link
            to="/dashboard"
            aria-label="Ver progreso completo"
            className="inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-primary"
          >
            <span className="hidden sm:inline">
              Ver detalles
            </span>

            <ArrowUpRight
              className="size-4"
              aria-hidden="true"
            />
          </Link>
        </div>

        {isLoading ? (
          <p
            role="status"
            className="mt-8 text-center text-sm text-muted-foreground"
          >
            Calculando tu progreso…
          </p>
        ) : (
          <div className="mt-4 grid min-w-0 gap-4 sm:grid-cols-[145px_minmax(0,1fr)] sm:items-center">
            <div className="mx-auto grid size-[132px] place-items-center">
              <svg
                className="col-start-1 row-start-1 size-full -rotate-90"
                viewBox="0 0 120 120"
                aria-hidden="true"
              >
                <circle
                  cx="60"
                  cy="60"
                  r="52"
                  fill="none"
                  stroke="hsl(var(--muted))"
                  strokeWidth="8"
                />

                <circle
                  cx="60"
                  cy="60"
                  r="52"
                  fill="none"
                  stroke="hsl(var(--primary))"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={progressOffset}
                />
              </svg>

              <div
                className="col-start-1 row-start-1 text-center"
                role="progressbar"
                aria-label="Progreso general"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={percentage}
              >
                <strong className="block text-3xl font-bold tracking-tight text-foreground">
                  {percentage}%
                </strong>

                <span className="text-[11px] text-muted-foreground">
                  Progreso general
                </span>
              </div>
            </div>

            <dl className="grid gap-3 border-t border-border pt-4 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
              <div className="flex items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <FileText
                    className="size-4"
                    aria-hidden="true"
                  />
                </span>

                <div>
                  <dd className="font-bold text-foreground">
                    {practicedConcepts} de {totalConcepts}
                  </dd>
                  <dt className="text-xs text-muted-foreground">
                    Conceptos
                  </dt>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Target
                    className="size-4"
                    aria-hidden="true"
                  />
                </span>

                <div>
                  <dd className="font-bold text-foreground">
                    {globalAccuracy === undefined
                      ? 'Sin datos'
                      : `${globalAccuracy}%`}
                  </dd>
                  <dt className="text-xs text-muted-foreground">
                    Precisión actual
                  </dt>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Clock3
                    className="size-4"
                    aria-hidden="true"
                  />
                </span>

                <div>
                  <dd className="font-bold text-foreground">
                    {recentSessions}
                  </dd>
                  <dt className="text-xs text-muted-foreground">
                    Sesiones recientes
                  </dt>
                </div>
              </div>
            </dl>
          </div>
        )}
      </section>
    );
  }

  return (
    <section
      aria-labelledby="home-progress-title"
      className="rounded-2xl border border-border bg-card p-5 shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <h2
          id="home-progress-title"
          className="text-xl font-bold text-foreground"
        >
          Progreso general
        </h2>

        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          {hasActivity ? (
            <TrendingUp
              className="size-5"
              aria-hidden="true"
            />
          ) : (
            <CircleDashed
              className="size-5"
              aria-hidden="true"
            />
          )}
        </span>
      </div>

      {isLoading ? (
        <p
          role="status"
          className="mt-5 text-sm text-muted-foreground"
        >
          Calculando tu progreso…
        </p>
      ) : hasActivity ? (
        <>
          <div className="mt-5 flex items-end justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              Conceptos practicados
            </p>

            <p className="text-3xl font-bold tracking-tight text-foreground">
              {percentage}%
            </p>
          </div>

          <div
            className="mt-3 h-2 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-label="Conceptos practicados"
            aria-valuemin={0}
            aria-valuemax={
              totalConcepts
            }
            aria-valuenow={
              practicedConcepts
            }
            aria-valuetext={`${practicedConcepts} de ${totalConcepts} conceptos practicados`}
          >
            <div
              className="h-full rounded-full bg-primary"
              style={{
                width:
                  `${percentage}%`,
              }}
            />
          </div>

          <p className="mt-2 text-xs text-muted-foreground">
            {practicedConcepts} de{' '}
            {totalConcepts} conceptos del catálogo
          </p>
        </>
      ) : (
        <>
          <div className="mt-3">
            <p className="font-semibold text-foreground">
              Aún no has comenzado.
            </p>

            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Completa tu primera sesión para empezar a ver tu avance.
            </p>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>
              {practicedConcepts} de{' '}
              {totalConcepts} conceptos
            </span>

            <span className="font-semibold text-foreground">
              0%
            </span>
          </div>

          <div
            className="mt-2 h-2 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-label="Conceptos practicados"
            aria-valuemin={0}
            aria-valuemax={
              totalConcepts
            }
            aria-valuenow={
              practicedConcepts
            }
            aria-valuetext={`${practicedConcepts} de ${totalConcepts} conceptos practicados`}
          >
            <div
              className="h-full rounded-full bg-primary"
              style={{
                width: '0%',
              }}
            />
          </div>
        </>
      )}

      <Link
        to="/dashboard"
        className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-semibold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {hasActivity
          ? 'Ver progreso detallado'
          : 'Ver progreso'}

        <ArrowUpRight
          className="size-4"
          aria-hidden="true"
        />
      </Link>
    </section>
  );
}
