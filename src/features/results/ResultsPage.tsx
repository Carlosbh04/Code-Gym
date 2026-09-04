import { CircleCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useContent } from '@/hooks/useContent';
import { useHistory } from '@/hooks/useHistory';
import type { CompletedSession } from '@/types/progress';

type ResultState =
  | { sessionId: string; status: 'loading' }
  | { sessionId: string; status: 'missing' }
  | { sessionId: string; status: 'error'; message: string }
  | { sessionId: string; status: 'success'; completedSession: CompletedSession };

type SessionMetadataState =
  | { sessionId: string; status: 'loading' }
  | { sessionId: string; status: 'success'; title: string }
  | { sessionId: string; status: 'unavailable' };

const PRIMARY_ACTION =
  'inline-flex min-h-11 w-full items-center justify-center rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:w-auto';

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function formatDuration(timeSpentMs: number): string {
  const totalSeconds = Math.max(0, Math.round(timeSpentMs / 1_000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes === 0) return `${seconds} s`;
  return seconds === 0 ? `${minutes} min` : `${minutes} min ${seconds} s`;
}

/**
 * Resumen factual de una sesión completada (T058).
 *
 * La metadata durable llega por HistoryContext; el título es una mejora visual
 * secundaria obtenida de ContentContext. Ninguna de las dos lecturas revela a
 * la UI detalles de Storage ni implementaciones concretas de repositorio.
 */
function ResultsPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { getCompletedSession } = useHistory();
  const { getSession } = useContent();
  const [result, setResult] = useState<ResultState | null>(null);
  const [metadata, setMetadata] = useState<SessionMetadataState | null>(null);

  useEffect(() => {
    if (sessionId === undefined) {
      return;
    }

    let active = true;

    void getCompletedSession(sessionId)
      .then((completedSession) => {
        if (!active) return;

        if (completedSession === null) {
          setResult({ sessionId, status: 'missing' });
          return;
        }

        setResult({ sessionId, status: 'success', completedSession });
        setMetadata({ sessionId, status: 'loading' });

        void getSession(sessionId)
          .then((session) => {
            if (!active) return;
            setMetadata(
              session === null
                ? { sessionId, status: 'unavailable' }
                : { sessionId, status: 'success', title: session.title },
            );
          })
          .catch(() => {
            if (active) setMetadata({ sessionId, status: 'unavailable' });
          });
      })
      .catch((error: unknown) => {
        if (active) {
          setResult({ sessionId, status: 'error', message: errorMessage(error) });
        }
      });

    return () => {
      active = false;
    };
  }, [getCompletedSession, getSession, sessionId]);

  const currentResult: ResultState | null =
    sessionId === undefined ? { sessionId: '', status: 'missing' } : result;

  if (
    currentResult === null ||
    currentResult.sessionId !== sessionId ||
    currentResult.status === 'loading'
  ) {
    return (
      <section
        aria-busy="true"
        aria-labelledby="results-loading-title"
        aria-live="polite"
        className="max-w-3xl py-8 sm:py-12"
      >
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">
          codegym practice
        </p>
        <h1
          id="results-loading-title"
          className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
        >
          Cargando resultado…
        </h1>
      </section>
    );
  }

  if (currentResult.status === 'missing') {
    return (
      <section aria-labelledby="results-missing-title" className="max-w-2xl py-8 sm:py-12">
        <h1
          id="results-missing-title"
          className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
        >
          Resultado no disponible
        </h1>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          No hemos encontrado un resultado guardado para esta sesión.
        </p>
        <Link to="/dashboard" className={`${PRIMARY_ACTION} mt-7`}>
          Ir al progreso
        </Link>
      </section>
    );
  }

  if (currentResult.status === 'error') {
    return (
      <section aria-labelledby="results-error-title" className="max-w-2xl py-8 sm:py-12">
        <h1
          id="results-error-title"
          className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
        >
          No pudimos cargar el resultado
        </h1>
        <p role="alert" className="mt-4 border-l-4 border-destructive pl-4 text-sm text-destructive">
          {currentResult.message}
        </p>
        <Link to="/dashboard" className={`${PRIMARY_ACTION} mt-7`}>
          Ir al progreso
        </Link>
      </section>
    );
  }

  const { completedSession } = currentResult;
  const title =
    metadata?.sessionId === completedSession.sessionId && metadata.status === 'success'
      ? metadata.title
      : 'Sesión completada';

  return (
    <section aria-labelledby="results-title" className="max-w-3xl py-2 sm:py-4">
      <p className="font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">
        codegym practice
      </p>
      <div
        aria-hidden="true"
        className="mt-4 flex size-12 items-center justify-center rounded-full bg-success/10 text-success animate-celebrate-check"
      >
        <CircleCheck className="size-7" />
      </div>
      <h1
        id="results-title"
        className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
      >
        Resultado de la sesión
      </h1>
      <p className="mt-4 text-lg font-semibold text-foreground">{title}</p>
      <p className="mt-2 text-base leading-relaxed text-muted-foreground">
        Has acertado {completedSession.correctSteps} de {completedSession.totalSteps} ejercicios.
      </p>

      {metadata?.sessionId === completedSession.sessionId &&
        metadata.status === 'unavailable' && (
          <p role="status" className="mt-3 text-sm text-muted-foreground">
            No se pudo cargar el nombre de la sesión, pero las métricas se han conservado.
          </p>
        )}

      <dl className="stagger-fade-in-up mt-8 grid gap-3 sm:grid-cols-3 sm:gap-4">
        <div className="rounded-md border border-border bg-card px-5 py-4">
          <dt className="text-sm text-muted-foreground">Respuestas correctas</dt>
          <dd className="mt-1 text-xl font-bold text-foreground">
            {completedSession.correctSteps} de {completedSession.totalSteps}
          </dd>
        </div>
        <div className="rounded-md border border-border bg-card px-5 py-4">
          <dt className="text-sm text-muted-foreground">Precisión</dt>
          <dd className="mt-1 text-xl font-bold text-foreground">
            {completedSession.accuracy}%
          </dd>
        </div>
        <div className="rounded-md border border-border bg-card px-5 py-4">
          <dt className="text-sm text-muted-foreground">Tiempo empleado</dt>
          <dd className="mt-1 text-xl font-bold text-foreground">
            {formatDuration(completedSession.timeSpentMs)}
          </dd>
        </div>
      </dl>

      <div className="mt-8">
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link to={`/review/${completedSession.sessionId}`} className={PRIMARY_ACTION}>
            Revisar respuestas
          </Link>
          <Link
            to="/dashboard"
            className="inline-flex min-h-11 w-full items-center justify-center rounded-md border border-border bg-card px-5 py-2.5 text-sm font-semibold text-foreground ring-offset-background transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:w-auto"
          >
            Ver mi progreso
          </Link>
        </div>
      </div>
    </section>
  );
}

export default ResultsPage;
