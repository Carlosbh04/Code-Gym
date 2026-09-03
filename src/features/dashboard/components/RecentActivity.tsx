import type { CompletedSession } from '@/types/progress';

export interface RecentActivityProps {
  sessions: CompletedSession[];
  sessionNames?: ReadonlyMap<string, string>;
  isLoading: boolean;
  error: string | null;
}

export function RecentActivity({
  sessions,
  sessionNames = new Map(),
  isLoading,
  error,
}: RecentActivityProps) {
  return (
    <section aria-labelledby="recent-activity-title" className="border-t border-border pt-8">
      <h2 id="recent-activity-title" className="text-xl font-bold text-foreground">
        Actividad reciente
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Último resultado guardado de cada sesión practicada.
      </p>

      {isLoading ? (
        <p role="status" aria-live="polite" className="mt-4 text-sm text-muted-foreground">
          Cargando actividad…
        </p>
      ) : error ? (
        <p role="alert" className="mt-4 border-l-4 border-destructive pl-4 text-sm text-destructive">
          No se pudo cargar la actividad reciente: {error}
        </p>
      ) : sessions.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Todavía no hay actividad reciente.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-border border-y border-border">
          {sessions.map((session) => (
            <li key={session.id} className="grid gap-2 py-4 sm:grid-cols-[1fr_auto] sm:items-center">
              <div className="min-w-0">
                <p className="break-words font-semibold text-foreground">
                  {sessionNames.get(session.sessionId) ?? session.sessionId}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {session.correctSteps}/{session.totalSteps} aciertos · {formatDuration(session.timeSpentMs)}
                </p>
              </div>
              <div className="flex items-baseline justify-between gap-4 sm:block sm:text-right">
                <p className="font-mono font-semibold text-foreground">
                  {Math.round(session.accuracy)} %
                </p>
                <time
                  dateTime={session.completedAt}
                  className="text-xs text-muted-foreground"
                >
                  {formatDate(session.completedAt)}
                </time>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function formatDuration(milliseconds: number): string {
  const seconds = Math.max(0, Math.round(milliseconds / 1_000));
  if (seconds < 60) return `${seconds} s`;
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return remainder === 0 ? `${minutes} min` : `${minutes} min ${remainder} s`;
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium' }).format(
    new Date(iso),
  );
}
