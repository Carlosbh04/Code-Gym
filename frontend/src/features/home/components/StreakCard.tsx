import { CheckCircle2, CircleDashed } from 'lucide-react';

import { Skeleton } from '@/components/codegym/Skeleton';

export function StreakCard({ completedSessions, isLoading }: { completedSessions: number; isLoading: boolean }) {
  const hasActivity = completedSessions > 0;
  return (
    <article className="rounded-2xl border border-border bg-card p-5 sm:p-6 lg:p-7">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        Actividad reciente
      </p>

      {isLoading ? (
        <div
          role="status"
          aria-live="polite"
          className="mt-5"
        >
          <span className="sr-only">
            Cargando tu actividad…
          </span>

          <div
            aria-hidden="true"
            className="flex items-center gap-3"
          >
            <Skeleton className="size-9 rounded-full" />
            <Skeleton className="h-9 w-16" />
          </div>

          <Skeleton
            aria-hidden="true"
            className="mt-3 h-4 w-4/5"
          />
        </div>
      ) : (
        <>
          <div className="mt-5 flex items-center gap-3">
            {hasActivity ? (
              <CheckCircle2
                className="size-9 text-success"
                aria-hidden="true"
              />
            ) : (
              <CircleDashed
                className="size-9 text-primary"
                aria-hidden="true"
              />
            )}

            <p className="text-3xl font-bold tracking-tight text-foreground">
              {completedSessions}
            </p>
          </div>

          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {hasActivity
              ? `${completedSessions} sesiones completadas recientemente.`
              : 'Completa tu primera sesión para ver tu actividad aquí.'}
          </p>
        </>
      )}
    </article>
  );
}
