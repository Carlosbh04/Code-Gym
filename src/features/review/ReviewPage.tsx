import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useContent } from '@/hooks/useContent';
import { useHistory } from '@/hooks/useHistory';
import type { ExerciseSession } from '@/types/exercise';
import type { Attempt } from '@/types/progress';
import { ReviewStep } from './components/ReviewStep';

type SessionResult =
  | { sessionId: string; status: 'missing' }
  | { sessionId: string; status: 'error'; message: string }
  | { sessionId: string; status: 'success'; session: ExerciseSession };

type AttemptsResult =
  | { sessionId: string; status: 'success'; attempts: Attempt[] }
  | { sessionId: string; status: 'error'; message: string };

const ACTION =
  'inline-flex min-h-11 w-full items-center justify-center rounded-md border border-border bg-card px-5 py-2.5 text-sm font-semibold text-foreground ring-offset-background transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:w-auto';

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Revisión de lectura de los steps de una sesión completada (T060). */
function ReviewPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { getSession } = useContent();
  const { getAttemptsBySession } = useHistory();
  const [sessionResult, setSessionResult] = useState<SessionResult | null>(null);
  const [attemptsResult, setAttemptsResult] = useState<AttemptsResult | null>(null);

  useEffect(() => {
    if (sessionId === undefined) return;

    let active = true;

    void getSession(sessionId)
      .then((session) => {
        if (!active) return;
        if (session === null) {
          setSessionResult({ sessionId, status: 'missing' });
          return;
        }

        setSessionResult({ sessionId, status: 'success', session });
        void getAttemptsBySession(sessionId)
          .then((attempts) => {
            if (active) setAttemptsResult({ sessionId, status: 'success', attempts });
          })
          .catch((error: unknown) => {
            if (active) {
              setAttemptsResult({
                sessionId,
                status: 'error',
                message: errorMessage(error),
              });
            }
          });
      })
      .catch((error: unknown) => {
        if (active) {
          setSessionResult({ sessionId, status: 'error', message: errorMessage(error) });
        }
      });

    return () => {
      active = false;
    };
  }, [getAttemptsBySession, getSession, sessionId]);

  const currentSession: SessionResult | null =
    sessionId === undefined ? { sessionId: '', status: 'missing' } : sessionResult;

  const attemptsByStepId = useMemo(() => {
    if (
      attemptsResult?.status !== 'success' ||
      attemptsResult.sessionId !== sessionId
    ) {
      return new Map<string, Attempt>();
    }

    const attempts = new Map<string, Attempt>();
    for (const attempt of attemptsResult.attempts) {
      if (!attempts.has(attempt.stepId)) attempts.set(attempt.stepId, attempt);
    }
    return attempts;
  }, [attemptsResult, sessionId]);

  if (
    currentSession === null ||
    currentSession.sessionId !== sessionId
  ) {
    return (
      <section
        aria-busy="true"
        aria-labelledby="review-loading-title"
        aria-live="polite"
        className="max-w-3xl py-8 sm:py-12"
      >
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">
          codegym review
        </p>
        <h1
          id="review-loading-title"
          className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
        >
          Cargando revisión…
        </h1>
      </section>
    );
  }

  if (currentSession.status === 'missing') {
    return (
      <section aria-labelledby="review-missing-title" className="max-w-2xl py-8 sm:py-12">
        <h1
          id="review-missing-title"
          className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
        >
          Sesión no disponible
        </h1>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          No hemos encontrado la sesión que quieres revisar.
        </p>
        <Link to="/dashboard" className={`${ACTION} mt-7`}>
          Ir al progreso
        </Link>
      </section>
    );
  }

  if (currentSession.status === 'error') {
    return (
      <section aria-labelledby="review-error-title" className="max-w-2xl py-8 sm:py-12">
        <h1
          id="review-error-title"
          className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
        >
          No pudimos cargar la sesión
        </h1>
        <p role="alert" className="mt-4 border-l-4 border-destructive pl-4 text-sm text-destructive">
          {currentSession.message}
        </p>
        <Link to="/dashboard" className={`${ACTION} mt-7`}>
          Ir al progreso
        </Link>
      </section>
    );
  }

  const { session } = currentSession;
  const currentAttempts =
    attemptsResult?.sessionId === sessionId ? attemptsResult : null;

  return (
    <section aria-labelledby="review-title" className="mx-auto max-w-4xl py-2 sm:py-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
        codegym review
      </p>
      <h1
        id="review-title"
        className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
      >
        Revisión de la sesión
      </h1>
      <p className="mt-4 text-lg font-semibold text-foreground">{session.title}</p>
      <p className="mt-2 text-sm text-muted-foreground">Concepto: {session.conceptId}</p>

      <div className="mt-7">
        <Link to={`/results/${session.id}`} className={ACTION}>
          Volver al resultado
        </Link>
      </div>

      <section aria-labelledby="review-steps-title" className="mt-10 border-t border-border pt-8">
        <h2 id="review-steps-title" className="text-2xl font-bold text-foreground">
          Ejercicios
        </h2>

        {currentAttempts === null ? (
          <p role="status" aria-live="polite" className="mt-5 text-sm text-muted-foreground">
            Cargando respuestas…
          </p>
        ) : currentAttempts.status === 'error' ? (
          <p role="alert" className="mt-5 border-l-4 border-destructive pl-4 text-sm text-destructive">
            No pudimos cargar las respuestas registradas. {currentAttempts.message}
          </p>
        ) : currentAttempts.attempts.length === 0 ? (
          <p className="mt-5 border-l-4 border-border pl-4 text-sm text-muted-foreground">
            No hay respuestas registradas para revisar.
          </p>
        ) : (
          <ol className="mt-5 flex flex-col gap-5">
            {session.steps.map((step, index) => (
              <li key={step.id}>
                <ReviewStep
                  step={step}
                  attempt={attemptsByStepId.get(step.id)}
                  position={index + 1}
                />
              </li>
            ))}
          </ol>
        )}
      </section>
    </section>
  );
}

export default ReviewPage;
