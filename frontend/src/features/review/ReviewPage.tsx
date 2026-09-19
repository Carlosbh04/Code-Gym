import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Skeleton } from '@/components/codegym/Skeleton';
import { useAuth } from '@/features/auth/AuthContext';
import { browserLearningApi } from '@/features/learning/learning-api';
import {
  canEnterLearningSession,
} from '@/features/learning/session-learning-kind';
import { useContent } from '@/hooks/useContent';
import { useHistory } from '@/hooks/useHistory';
import type { Topic } from '@/types/content';
import type { ExerciseSession } from '@/types/exercise';
import type { HistoryAttempt } from '@/types/history';
import { ReviewNavigation } from './components/ReviewNavigation';
import { ReviewStep } from './components/ReviewStep';
import { ReviewStepIndicator } from './components/ReviewStepIndicator';
import { ReviewSummary } from './components/ReviewSummary';

type SessionResult =
  | { sessionId: string; status: 'missing' }
  | { sessionId: string; status: 'error'; message: string }
  | { sessionId: string; status: 'success'; session: ExerciseSession };
type AttemptsResult =
  | { sessionId: string; status: 'success'; attempts: HistoryAttempt[] }
  | { sessionId: string; status: 'error'; message: string };
type MetadataResult =
  | { sessionId: string; status: 'loading' }
  | { sessionId: string; status: 'success'; topic: Topic | null }
  | { sessionId: string; status: 'unavailable' };

type RepeatPracticeAccess =
  | {
      readonly sessionId:
        null;
      readonly status:
        'idle';
    }
  | {
      readonly sessionId:
        string;
      readonly status:
        'checking'
        | 'allowed'
        | 'blocked';
    };

const ACTION = 'inline-flex min-h-11 w-full items-center justify-center rounded-md border border-border bg-card px-5 py-2.5 text-sm font-semibold text-foreground ring-offset-background transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:w-auto';
const errorMessage = (error: unknown) => error instanceof Error ? error.message : String(error);

/** Revisión de lectura: muestra el historial persistido sin alterar la sesión. */
function ReviewPage() {
  const { sessionId } = useParams<{ sessionId: string }>();

  const {
    accessToken,
  } = useAuth();

  const { getSession, getConcept, getTechnology, getTopics } = useContent();
  const { getAttemptsBySession } = useHistory();
  const [sessionResult, setSessionResult] = useState<SessionResult | null>(null);
  const [attemptsResult, setAttemptsResult] = useState<AttemptsResult | null>(null);
  const [metadata, setMetadata] = useState<MetadataResult | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const [
    repeatPracticeAccess,
    setRepeatPracticeAccess,
  ] = useState<RepeatPracticeAccess>({
    sessionId:
      null,
    status:
      'idle',
  });

  useEffect(() => {
    if (sessionId === undefined) return;
    let active = true;
    void getSession(sessionId).then((session) => {
      if (!active) return;
      if (session === null) { setSessionResult({ sessionId, status: 'missing' }); return; }
      setCurrentIndex(0);
      setSessionResult({ sessionId, status: 'success', session });
      setAttemptsResult(null);
      setMetadata({ sessionId, status: 'loading' });
      void Promise.resolve(getAttemptsBySession(sessionId)).then((attempts) => {
        if (active) setAttemptsResult({ sessionId, status: 'success', attempts });
      }).catch((error: unknown) => {
        if (active) setAttemptsResult({ sessionId, status: 'error', message: errorMessage(error) });
      });
      void Promise.all([Promise.resolve(getConcept(session.conceptId)).catch(() => null), Promise.resolve(getTopics(session.technologyId)).catch(() => [])]).then(([concept, topics]) => {
        if (!active) return;
        const topicId = concept === null || concept === undefined ? null : concept.topicId;
        setMetadata({ sessionId, status: 'success', topic: topicId === null || !Array.isArray(topics) ? null : topics.find((topic) => topic.id === topicId) ?? null });
      }).catch(() => { if (active) setMetadata({ sessionId, status: 'unavailable' }); });
    }).catch((error: unknown) => { if (active) setSessionResult({ sessionId, status: 'error', message: errorMessage(error) }); });
    return () => { active = false; };
  }, [getAttemptsBySession, getConcept, getSession, getTopics, sessionId]);

  // REVIEW_PAGE_REPEAT_PRACTICE_GATE
  useEffect(
    () => {
      if (
        sessionResult === null
        || sessionResult.status
          !== 'success'
      ) {
        return;
      }

      const session =
        sessionResult.session;

      /*
       * Contenido legacy mantiene exactamente
       * el comportamiento histórico.
       */
      if (
        session.levelId
        === undefined
      ) {
        setRepeatPracticeAccess({
          sessionId:
            session.id,
          status:
            'allowed',
        });

        return;
      }

      let active =
        true;

      const levelId =
        session.levelId;

      setRepeatPracticeAccess({
        sessionId:
          session.id,
        status:
          'checking',
      });

      const verify =
        async () => {
          if (
            accessToken
            === null
          ) {
            if (active) {
              setRepeatPracticeAccess({
                sessionId:
                  session.id,
                status:
                  'blocked',
              });
            }

            return;
          }

          try {
            const levelState =
              await browserLearningApi
                .getLevelState(
                  session.conceptId,
                  levelId,
                  accessToken,
                );

            if (!active) {
              return;
            }

            setRepeatPracticeAccess({
              sessionId:
                session.id,
              status:
                canEnterLearningSession(
                  session,
                  levelState,
                )
                  ? 'allowed'
                  : 'blocked',
            });
          } catch {
            if (active) {
              setRepeatPracticeAccess({
                sessionId:
                  session.id,
                status:
                  'blocked',
              });
            }
          }
        };

      void verify();

      return () => {
        active =
          false;
      };
    },
    [
      accessToken,
      sessionResult,
    ],
  );

  const currentSession = sessionId === undefined ? { sessionId: '', status: 'missing' as const } : sessionResult;
  const attemptsByStepId = useMemo(() => {
    const result = new Map<string, HistoryAttempt[]>();
    if (attemptsResult?.status !== 'success' || attemptsResult.sessionId !== sessionId) return result;
    for (const attempt of attemptsResult.attempts) result.set(attempt.stepId, [...(result.get(attempt.stepId) ?? []), attempt]);
    return result;
  }, [attemptsResult, sessionId]);

  if (currentSession === null || currentSession.sessionId !== sessionId) return <Loading />;
  if (currentSession.status === 'missing') return <Unavailable />;
  if (currentSession.status === 'error') return <LoadError message={currentSession.message} />;

  const { session } = currentSession;
  const stepCount = session.steps.length;
  const safeIndex = Math.min(currentIndex, Math.max(0, stepCount - 1));
  const currentStep = session.steps[safeIndex];
  const currentStepAttempts = currentStep === undefined ? [] : attemptsByStepId.get(currentStep.id) ?? [];
  const currentAttempt = currentStepAttempts[currentStepAttempts.length - 1];
  const topic = metadata?.sessionId === sessionId && metadata.status === 'success' ? metadata.topic : null;
  const technology = getTechnology(session.technologyId);
  const technologyName = technology?.name ?? session.technologyId;
  const attemptsStatus = attemptsResult?.sessionId === sessionId ? attemptsResult : null;

  const repeatPracticeAllowed =
    session.levelId
      === undefined
    || (
      repeatPracticeAccess.sessionId
        === session.id
      && repeatPracticeAccess.status
        === 'allowed'
    );

  return <section aria-labelledby="review-title" className="mx-auto w-full max-w-7xl py-2 sm:py-4"><nav aria-label="Breadcrumb" className="mb-5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground"><Link to="/tech" className="rounded-sm text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Entrenar</Link><span aria-hidden="true">›</span><Link to={`/tech/${session.technologyId}`} className="rounded-sm text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{technologyName}</Link>{topic !== null && <><span aria-hidden="true">›</span><Link to={`/tech/${topic.technologyId}/${topic.id}`} className="rounded-sm text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{topic.name}</Link></>}<span aria-hidden="true">›</span><Link to={`/results/${session.id}`} className="rounded-sm text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Resultado</Link><span aria-hidden="true">›</span><span aria-current="page" className="text-foreground">Revisión</span></nav><header className="mb-6"><p className="text-sm font-semibold text-primary">{topic === null ? technologyName : `${technologyName} / ${topic.name}`}</p><h1 id="review-title" className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Revisión de respuestas</h1><p className="mt-3 text-base font-medium text-foreground">{session.title}</p>{stepCount > 0 && <p className="mt-1 text-sm text-muted-foreground">Pregunta {safeIndex + 1} de {stepCount}</p>}</header>{stepCount === 0 ? <section className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground"><h2 className="text-lg font-bold text-foreground">No hay preguntas para revisar</h2><p className="mt-2">La sesión no contiene pasos registrados.</p><Link to={`/results/${session.id}`} className={`${ACTION} mt-5`}>Volver a resultados</Link></section> : <>{attemptsStatus === null ? <ReviewAttemptsLoading stepCount={stepCount} /> : <><ReviewStepIndicator steps={session.steps} attemptsByStepId={attemptsByStepId} currentIndex={safeIndex} onSelect={setCurrentIndex} />{attemptsStatus.status === 'error' ? <p role="alert" className="mt-6 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">No pudimos cargar las respuestas registradas. {attemptsStatus.message}</p> : attemptsStatus.attempts.length === 0 ? <p className="mt-6 rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">No hay respuestas registradas para revisar.</p> : <div className="mt-6 grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(18rem,0.75fr)] lg:items-start"><div className="min-w-0 space-y-5"><ReviewStep step={currentStep} attempt={currentAttempt} position={safeIndex + 1} /><ReviewNavigation sessionId={session.id} position={safeIndex + 1} totalSteps={stepCount} onPrevious={() => setCurrentIndex((index) => Math.max(0, index - 1))} onNext={() => setCurrentIndex((index) => Math.min(stepCount - 1, index + 1))} /></div><div className="min-w-0 space-y-5"><ReviewSummary technologyName={technologyName} topicName={topic?.name} sessionTitle={session.title} difficulty={session.difficulty} position={safeIndex + 1} totalSteps={stepCount} attempt={currentAttempt} attemptCount={currentStepAttempts.length} />{repeatPracticeAllowed ? <Link to={`/practice/${session.id}`} className={`${ACTION} w-full`}>Repetir práctica</Link> : null}</div></div>}</>}</>}</section>;
}

function ReviewAttemptsLoading({ stepCount }: { stepCount: number }) {
  const visibleSteps = Math.min(Math.max(stepCount, 1), 6);

  return (
    <div
      role="status"
      aria-live="polite"
      className="min-w-0"
    >
      <span className="sr-only">
        Cargando respuestas…
      </span>

      <div
        aria-hidden="true"
        className="overflow-hidden pb-1"
      >
        <div className="flex gap-2">
          {Array.from({ length: visibleSteps }, (_, index) => (
            <Skeleton
              key={index}
              className="h-11 w-12 shrink-0 rounded-lg"
            />
          ))}
        </div>

        <div className="mt-6 grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(18rem,0.75fr)] lg:items-start">
          <div className="min-w-0 space-y-5">
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
              <div className="flex flex-col gap-5">
                <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="mt-3 h-7 w-4/5 max-w-xl" />
                  </div>

                  <Skeleton className="h-9 w-36 rounded-full" />
                </header>

                <div>
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="mt-3 h-40 w-full rounded-xl" />
                </div>

                <div className="rounded-xl border border-border p-4">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="mt-3 h-3 w-full" />
                  <Skeleton className="mt-2 h-3 w-4/5" />
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
              <Skeleton className="h-11 w-full rounded-md sm:w-28" />
              <Skeleton className="h-11 w-full rounded-md sm:w-36" />
              <Skeleton className="h-11 w-full rounded-md sm:w-28" />
            </div>
          </div>

          <div className="min-w-0 space-y-5">
            <aside className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="mt-4 h-9 w-36 rounded-full" />

              <div className="mt-5 divide-y divide-border">
                {Array.from({ length: 5 }, (_, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between gap-4 py-3"
                  >
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                ))}
              </div>

              <Skeleton className="mt-5 h-4 w-3/4" />
            </aside>

            <Skeleton className="h-11 w-full rounded-md" />
          </div>
        </div>
      </div>
    </div>
  );
}

function Loading() {
  return (
    <section
      aria-busy="true"
      aria-labelledby="review-loading-title"
      aria-live="polite"
      className="mx-auto w-full max-w-7xl py-2 sm:py-4"
    >
      <h1
        id="review-loading-title"
        className="sr-only"
      >
        Cargando revisión…
      </h1>

      <div aria-hidden="true">
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-3" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-3" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-3" />
          <Skeleton className="h-4 w-20" />
        </div>

        <header className="mb-6">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="mt-3 h-9 w-80 max-w-full sm:h-10" />
          <Skeleton className="mt-4 h-4 w-64 max-w-full" />
          <Skeleton className="mt-2 h-3 w-28" />
        </header>

        <div className="flex gap-2 overflow-hidden pb-1">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton
              key={index}
              className="h-11 w-12 shrink-0 rounded-lg"
            />
          ))}
        </div>

        <div className="mt-6 grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(18rem,0.75fr)] lg:items-start">
          <div className="min-w-0 space-y-5">
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="mt-3 h-7 w-4/5 max-w-xl" />

              <Skeleton className="mt-6 h-4 w-28" />
              <Skeleton className="mt-3 h-40 w-full rounded-xl" />

              <div className="mt-5 rounded-xl border border-border p-4">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="mt-3 h-3 w-full" />
                <Skeleton className="mt-2 h-3 w-4/5" />
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
              <Skeleton className="h-11 w-full rounded-md sm:w-28" />
              <Skeleton className="h-11 w-full rounded-md sm:w-36" />
              <Skeleton className="h-11 w-full rounded-md sm:w-28" />
            </div>
          </div>

          <div className="min-w-0 space-y-5">
            <aside className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="mt-4 h-9 w-36 rounded-full" />

              <div className="mt-5 divide-y divide-border">
                {Array.from({ length: 5 }, (_, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between gap-4 py-3"
                  >
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                ))}
              </div>

              <Skeleton className="mt-5 h-4 w-3/4" />
            </aside>

            <Skeleton className="h-11 w-full rounded-md" />
          </div>
        </div>
      </div>
    </section>
  );
}
function Unavailable() { return <section aria-labelledby="review-missing-title" className="max-w-2xl py-8 sm:py-12"><h1 id="review-missing-title" className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Sesión no disponible</h1><p className="mt-4 text-base leading-relaxed text-muted-foreground">No hemos encontrado la sesión que quieres revisar.</p><Link to="/dashboard" className={`${ACTION} mt-7`}>Ir al progreso</Link></section>; }
function LoadError({ message }: { message: string }) { return <section aria-labelledby="review-error-title" className="max-w-2xl py-8 sm:py-12"><h1 id="review-error-title" className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">No pudimos cargar la sesión</h1><p role="alert" className="mt-4 border-l-4 border-destructive pl-4 text-sm text-destructive">{message}</p><Link to="/dashboard" className={`${ACTION} mt-7`}>Ir al progreso</Link></section>; }

export default ReviewPage;
