import { useContext, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Skeleton } from '@/components/codegym/Skeleton';
import { ProgressContext } from '@/contexts/progress-context';
import { useContent } from '@/hooks/useContent';
import { useHistory } from '@/hooks/useHistory';
import type { Topic } from '@/types/content';
import type { ExerciseSession } from '@/types/exercise';
import type { CompletedSession } from '@/types/progress';
import type { HistoryAttempt } from '@/types/history';
import { AnswerReviewList } from './components/AnswerReviewList';
import { ResultsHero } from './components/ResultsHero';
import { ResultsProgress } from './components/ResultsProgress';
import { ResultSummary } from './components/ResultSummary';

type ResultState =
  | { sessionId: string; status: 'loading' }
  | { sessionId: string; status: 'missing' }
  | { sessionId: string; status: 'error'; message: string }
  | { sessionId: string; status: 'success'; completedSession: CompletedSession };
type MetadataState =
  | { sessionId: string; status: 'loading' }
  | { sessionId: string; status: 'success'; session: ExerciseSession; topic: Topic | null }
  | { sessionId: string; status: 'unavailable' };
type AttemptsState =
  | { sessionId: string; status: 'success'; attempts: HistoryAttempt[] }
  | { sessionId: string; status: 'error'; message: string };

const ACTION = 'inline-flex min-h-11 w-full items-center justify-center rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:w-auto';
const errorMessage = (error: unknown) => error instanceof Error ? error.message : String(error);

/** Presenta resultado y progreso persistidos: no recalcula score ni muta sesión. */
function ResultsPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { getCompletedSession, getAttemptsBySession } = useHistory();
  const { getSession, getConcept, getTopics, getTechnology } = useContent();
  const progressContext = useContext(ProgressContext);
  const [result, setResult] = useState<ResultState | null>(null);
  const [metadata, setMetadata] = useState<MetadataState | null>(null);
  const [attempts, setAttempts] = useState<AttemptsState | null>(null);

  useEffect(() => {
    if (sessionId === undefined) return;
    let active = true;
    void getCompletedSession(sessionId).then((completedSession) => {
      if (!active) return;
      if (completedSession === null) { setResult({ sessionId, status: 'missing' }); return; }
      setResult({ sessionId, status: 'success', completedSession });
      setMetadata({ sessionId, status: 'loading' });
      setAttempts(null);
      void Promise.resolve(getAttemptsBySession(sessionId)).then((items) => {
        if (active) setAttempts({ sessionId, status: 'success', attempts: items });
      }).catch((error: unknown) => {
        if (active) setAttempts({ sessionId, status: 'error', message: errorMessage(error) });
      });
      void getSession(sessionId).then(async (session) => {
        if (!active) return;
        if (session === null) { setMetadata({ sessionId, status: 'unavailable' }); return; }
        const concept = await Promise.resolve(getConcept(session.conceptId)).catch(() => null);
        const topics = await Promise.resolve(getTopics(session.technologyId)).catch(() => []);
        const topicId = concept === null || concept === undefined ? null : concept.topicId;
        if (active) setMetadata({
          sessionId,
          status: 'success',
          session,
          topic: topicId === null || !Array.isArray(topics) ? null : topics.find((topic) => topic.id === topicId) ?? null,
        });
      }).catch(() => { if (active) setMetadata({ sessionId, status: 'unavailable' }); });
    }).catch((error: unknown) => {
      if (active) setResult({ sessionId, status: 'error', message: errorMessage(error) });
    });
    return () => { active = false; };
  }, [getAttemptsBySession, getCompletedSession, getConcept, getSession, getTopics, sessionId]);

  const currentResult: ResultState | null = sessionId === undefined ? { sessionId: '', status: 'missing' } : result;
  if (currentResult === null || currentResult.sessionId !== sessionId || currentResult.status === 'loading') return <Loading />;
  if (currentResult.status === 'missing') return <Unavailable />;
  if (currentResult.status === 'error') return <LoadError message={currentResult.message} />;

  const { completedSession } = currentResult;
  const metadataStatus = metadata?.sessionId === sessionId ? metadata : null;
  const currentMetadata = metadataStatus?.status === 'success' ? metadataStatus : null;
  const metadataLoading = metadataStatus === null || metadataStatus.status === 'loading';
  const metadataUnavailable = metadataStatus?.status === 'unavailable';

  const technology = getTechnology(completedSession.technologyId);
  const topic = currentMetadata?.topic ?? null;

  const sessionTitle = currentMetadata?.session.title
    ?? (metadataUnavailable ? 'Sesión completada' : null);

  const secondaryAction = metadataLoading
    ? null
    : topic === null
      ? { to: '/dashboard', label: 'Ver mi progreso' }
      : { to: `/tech/${topic.technologyId}/${topic.id}`, label: 'Repasar tema' };

  const currentAttempts = attempts?.sessionId === sessionId ? attempts : null;
  const conceptProgress = progressContext?.progress.get(completedSession.conceptId);

  return <section aria-labelledby="results-title" className="mx-auto w-full max-w-7xl py-2 sm:py-4">
    <nav aria-label="Breadcrumb" className="mb-5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
      <Link to="/#technologies" className="rounded-sm text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Entrenar</Link><span aria-hidden="true">›</span>
      <Link to={`/tech/${completedSession.technologyId}`} className="rounded-sm text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{technology?.name ?? completedSession.technologyId}</Link>
      {topic !== null && <><span aria-hidden="true">›</span><Link to={`/tech/${topic.technologyId}/${topic.id}`} className="rounded-sm text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{topic.name}</Link></>}
      <span aria-hidden="true">›</span><span aria-current="page" className="text-foreground">Resultado</span>
    </nav>
    <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(20rem,0.75fr)] lg:items-start">
      <div className="min-w-0 space-y-5">
        <ResultsHero
          completedSession={completedSession}
          sessionTitle={sessionTitle}
          secondaryAction={secondaryAction}
        />

        {metadataLoading ? (
          <ResultDetailsLoading />
        ) : currentMetadata !== null ? (
          <AnswerReviewList
            session={currentMetadata.session}
            attempts={
              currentAttempts?.status === 'success'
                ? currentAttempts.attempts
                : null
            }
            error={
              currentAttempts?.status === 'error'
                ? currentAttempts.message
                : null
            }
          />
        ) : null}

        {metadataUnavailable && (
          <p
            role="status"
            className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground"
          >
            No se pudo cargar el detalle de la sesión, pero las métricas se han conservado.
          </p>
        )}
      </div>
      <aside aria-label="Resumen y progreso" className="min-w-0 space-y-5">
        <ResultSummary
          completedSession={completedSession}
          difficulty={currentMetadata?.session.difficulty}
          topicName={topic?.name}
          metadataLoading={metadataLoading}
        />

        {progressContext?.isLoading ? (
          <ResultsProgressLoading />
        ) : (
          <ResultsProgress progress={conceptProgress} />
        )}
        <blockquote className="rounded-2xl border border-primary/25 bg-primary/5 p-5 text-base leading-relaxed text-foreground"><span aria-hidden="true" className="mr-2 text-2xl text-primary">“</span>La práctica constante convierte la confusión en confianza.</blockquote>
      </aside>
    </div>
  </section>;
}

function ResultDetailsLoading() {
  return (
    <section
      role="status"
      aria-live="polite"
      className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6"
    >
      <span className="sr-only">Cargando detalle de la sesión…</span>

      <div aria-hidden="true">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Skeleton className="h-3 w-16" />
            <Skeleton className="mt-2 h-6 w-48" />
          </div>

          <Skeleton className="h-11 w-36 rounded-md" />
        </div>

        <div className="mt-5 space-y-2">
          {Array.from({ length: 4 }, (_, index) => (
            <div
              key={index}
              className="flex min-h-11 items-center gap-3 rounded-xl border border-border bg-background/30 p-3"
            >
              <Skeleton className="size-8 shrink-0 rounded-lg" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="size-4 shrink-0 rounded-md" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ResultsProgressLoading() {
  return (
    <section
      role="status"
      aria-live="polite"
      className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6"
    >
      <span className="sr-only">Cargando progreso…</span>

      <div aria-hidden="true">
        <div className="flex items-center justify-between gap-3">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-4 w-10" />
        </div>

        <Skeleton className="mt-4 h-2 w-full rounded-full" />
        <Skeleton className="mt-3 h-4 w-full" />
        <Skeleton className="mt-2 h-4 w-4/5" />
        <Skeleton className="mt-4 h-11 w-32 rounded-md" />
      </div>
    </section>
  );
}

function Loading() {
  return (
    <section
      aria-busy="true"
      aria-labelledby="results-loading-title"
      aria-live="polite"
      className="mx-auto w-full max-w-7xl py-2 sm:py-4"
    >
      <h1 id="results-loading-title" className="sr-only">
        Cargando resultado…
      </h1>

      <div aria-hidden="true">
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-3" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-3" />
          <Skeleton className="h-4 w-20" />
        </div>

        <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(20rem,0.75fr)] lg:items-start">
          <div className="min-w-0 space-y-5">
            <section className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-10">
              <div className="mx-auto flex max-w-2xl flex-col items-center">
                <Skeleton className="size-16 rounded-full" />
                <Skeleton className="mt-5 h-4 w-32" />
                <Skeleton className="mt-3 h-9 w-72 max-w-full sm:h-10" />
                <Skeleton className="mt-4 h-4 w-full max-w-xl" />
                <Skeleton className="mt-2 h-4 w-4/5 max-w-lg" />
                <Skeleton className="mt-3 h-4 w-48" />

                <div className="mt-7 flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row">
                  <Skeleton className="h-11 w-full rounded-md sm:w-40" />
                  <Skeleton className="h-11 w-full rounded-md sm:w-36" />
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="mt-2 h-6 w-48" />
                </div>

                <Skeleton className="h-11 w-36 rounded-md" />
              </div>

              <div className="mt-5 space-y-2">
                {Array.from({ length: 4 }, (_, index) => (
                  <div
                    key={index}
                    className="flex min-h-11 items-center gap-3 rounded-xl border border-border p-3"
                  >
                    <Skeleton className="size-8 shrink-0 rounded-lg" />
                    <Skeleton className="h-4 flex-1" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                ))}
              </div>
            </section>
          </div>

          <aside className="min-w-0 space-y-5">
            <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
              <Skeleton className="h-6 w-28" />
              <Skeleton className="mx-auto mt-5 size-36 rounded-full" />

              <div className="mt-6 divide-y divide-border">
                {Array.from({ length: 4 }, (_, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between gap-4 py-3"
                  >
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))}
              </div>
            </section>

            <ResultsProgressLoading />

            <Skeleton className="h-28 w-full rounded-2xl" />
          </aside>
        </div>
      </div>
    </section>
  );
}
function Unavailable() { return <section aria-labelledby="results-missing-title" className="max-w-2xl py-8 sm:py-12"><h1 id="results-missing-title" className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Resultado no disponible</h1><p className="mt-4 text-base leading-relaxed text-muted-foreground">No hemos encontrado un resultado guardado para esta sesión.</p><Link to="/dashboard" className={`${ACTION} mt-7`}>Ir al progreso</Link></section>; }
function LoadError({ message }: { message: string }) { return <section aria-labelledby="results-error-title" className="max-w-2xl py-8 sm:py-12"><h1 id="results-error-title" className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">No pudimos cargar el resultado</h1><p role="alert" className="mt-4 border-l-4 border-destructive pl-4 text-sm text-destructive">{message}</p><Link to="/dashboard" className={`${ACTION} mt-7`}>Ir al progreso</Link></section>; }

export default ResultsPage;
