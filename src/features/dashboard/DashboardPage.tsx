import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useContent } from '@/hooks/useContent';
import { useHistory } from '@/hooks/useHistory';
import { useProgress } from '@/hooks/useProgress';
import { useResetProgress } from '@/hooks/useResetProgress';
import type { ExerciseSession, ExerciseStep } from '@/types/exercise';
import { DiagnosisVerdict } from './components/DiagnosisVerdict';
import { EvidencePiece } from './components/EvidencePiece';
import { ProgressOverview } from './components/ProgressOverview';
import { RecentActivity } from './components/RecentActivity';
import {
  WeakConcepts,
  type NamedDashboardConcept,
} from './components/WeakConcepts';
import {
  createDashboardVerdict,
  createDashboardViewModel,
  selectCodePiece,
  selectRecommendedSession,
} from './dashboard-view-model';

interface Recommendation {
  session: ExerciseSession;
  step: ExerciseStep | null;
}

interface RecommendationResolution {
  conceptId: string;
  recommendation: Recommendation | null;
  error: string | null;
}

const GENERAL_CTA =
  'inline-flex min-h-11 w-full items-center justify-center rounded-md bg-foreground px-5 py-2.5 text-sm font-semibold text-background ring-offset-background transition-colors hover:bg-foreground/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:w-auto';

function DashboardPage() {
  const { progress, isLoading: progressLoading, error: progressError } =
    useProgress();
  const {
    recentCompletedSessions,
    completedSessionsLoading,
    completedSessionsError,
  } = useHistory();
  const { getConcept, getSession, getSessionsByConcept } = useContent();
  const { resetProgress } = useResetProgress();
  const [resetOpen, setResetOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const confirmReset = async () => {
    if (resetting) return;
    setResetting(true); setResetError(null);
    try { await resetProgress(); setResetOpen(false); }
    catch (error) { setResetError(error instanceof Error ? error.message : String(error)); }
    finally { setResetting(false); }
  };
  const model = useMemo(
    () => createDashboardViewModel(progress.values()),
    [progress],
  );
  const conceptIds = useMemo(
    () => Array.from(progress.keys()).sort(),
    [progress],
  );
  const [conceptNames, setConceptNames] = useState<Map<string, string>>(
    () => new Map(),
  );
  const [sessionNames, setSessionNames] = useState<Map<string, string>>(
    () => new Map(),
  );
  const [recommendationResolution, setRecommendationResolution] =
    useState<RecommendationResolution | null>(null);

  useEffect(() => {
    if (conceptIds.length === 0) {
      return;
    }

    let active = true;
    void Promise.allSettled(
      conceptIds.map(async (conceptId) => ({
        conceptId,
        concept: await getConcept(conceptId),
      })),
    ).then((results) => {
      if (!active) return;
      const names = new Map<string, string>();
      for (const result of results) {
        if (result.status === 'fulfilled' && result.value.concept !== null) {
          names.set(result.value.conceptId, result.value.concept.name);
        }
      }
      setConceptNames(names);
    });

    return () => {
      active = false;
    };
  }, [conceptIds, getConcept]);

  useEffect(() => {
    const sessionIds = recentCompletedSessions.map((session) => session.sessionId);
    if (sessionIds.length === 0) {
      return;
    }

    let active = true;
    void Promise.allSettled(
      sessionIds.map(async (sessionId) => ({
        sessionId,
        session: await getSession(sessionId),
      })),
    ).then((results) => {
      if (!active) return;
      const names = new Map<string, string>();
      for (const result of results) {
        if (result.status === 'fulfilled' && result.value.session !== null) {
          names.set(result.value.sessionId, result.value.session.title);
        }
      }
      setSessionNames(names);
    });

    return () => {
      active = false;
    };
  }, [getSession, recentCompletedSessions]);

  const priorityConceptId = model.priorityConcept?.conceptId ?? null;
  useEffect(() => {
    if (priorityConceptId === null) return;

    let active = true;
    getSessionsByConcept(priorityConceptId)
      .then((sessions) => {
        if (!active) return;
        const session = selectRecommendedSession(sessions);
        setRecommendationResolution({
          conceptId: priorityConceptId,
          recommendation:
            session === null ? null : { session, step: selectCodePiece(session) },
          error: null,
        });
      })
      .catch((error: unknown) => {
        if (!active) return;
        setRecommendationResolution({
          conceptId: priorityConceptId,
          recommendation: null,
          error: error instanceof Error ? error.message : String(error),
        });
      });

    return () => {
      active = false;
    };
  }, [getSessionsByConcept, priorityConceptId]);

  const resolvedRecommendation =
    recommendationResolution?.conceptId === priorityConceptId
      ? recommendationResolution
      : null;

  const nameOf = (conceptId: string) =>
    conceptNames.get(conceptId) ?? conceptId;
  const namedOtherConcepts: NamedDashboardConcept[] = model.otherConcepts.map(
    (concept) => ({ ...concept, name: nameOf(concept.conceptId) }),
  );
  const namedObservedConcepts: NamedDashboardConcept[] =
    model.observedConcepts.map((concept) => ({
      ...concept,
      name: nameOf(concept.conceptId),
    }));
  const activity = (
    <RecentActivity
      sessions={recentCompletedSessions}
      sessionNames={sessionNames}
      isLoading={completedSessionsLoading}
      error={completedSessionsError}
    />
  );
  const resetAction = (
    <section className="border-t border-border pt-6" aria-labelledby="reset-progress-title">
      <h2 id="reset-progress-title" className="text-sm font-semibold text-foreground">Restablecer progreso</h2>
      <p className="mt-2 text-sm text-muted-foreground">Elimina los datos de práctica guardados en este dispositivo.</p>
      <button type="button" className="mt-3 rounded-md border border-destructive px-4 py-2 text-sm font-semibold text-destructive" onClick={() => setResetOpen(true)}>Restablecer progreso</button>
      {resetOpen && <div role="dialog" aria-modal="true" aria-labelledby="reset-dialog-title" aria-describedby="reset-dialog-description" className="mt-4 max-w-lg rounded-md border border-destructive/50 bg-muted p-4">
        <h3 id="reset-dialog-title" className="font-semibold">¿Restablecer progreso?</h3>
        <p id="reset-dialog-description" className="mt-2 text-sm text-muted-foreground">Se eliminarán tu progreso, intentos y sesiones completadas guardadas en este dispositivo. Esta acción no se puede deshacer.</p>
        {resetError && <p role="alert" className="mt-3 text-sm text-destructive">No se pudo restablecer el progreso: {resetError}</p>}
        <div className="mt-4 flex gap-3"><button type="button" disabled={resetting} onClick={() => setResetOpen(false)}>Cancelar</button><button type="button" disabled={resetting} onClick={confirmReset} className="rounded-md bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground">{resetting ? 'Restableciendo…' : 'Restablecer progreso'}</button></div>
      </div>}
    </section>
  );

  if (progressLoading) {
    return (
      <section
        aria-labelledby="dashboard-loading-title"
        aria-busy="true"
        aria-live="polite"
        className="space-y-6"
      >
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">
          codegym progress
        </p>
        <h1 id="dashboard-loading-title" className="text-3xl font-bold text-foreground">
          Cargando progreso…
        </h1>
        <div aria-hidden="true" className="space-y-3 border-l-4 border-border pl-6">
          <div className="h-4 w-24 rounded-sm bg-muted" />
          <div className="h-9 w-full max-w-xl rounded-sm bg-muted" />
          <div className="h-4 w-2/3 rounded-sm bg-muted" />
        </div>
      </section>
    );
  }

  if (progressError !== null) {
    return (
      <div className="space-y-10">
        <section aria-labelledby="progress-error-title">
          <p className="font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">
            codegym progress
          </p>
          <h1 id="progress-error-title" className="mt-3 text-3xl font-bold text-foreground">
            No pudimos leer tu progreso.
          </h1>
          <p role="alert" className="mt-5 border-l-4 border-destructive pl-4 text-sm text-destructive">
            {progressError}
          </p>
        </section>
        {activity}
        {resetAction}
      </div>
    );
  }

  if (model.state === 'empty') {
    return (
      <div className="space-y-10">
        <section aria-labelledby="empty-dashboard-title" className="max-w-2xl py-8 sm:py-12">
          <p className="font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">
            codegym progress · sin datos
          </p>
          <h1 id="empty-dashboard-title" className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Todavía no hay nada que diagnosticar.
          </h1>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Completa una práctica para empezar a construir una imagen real de tu progreso.
          </p>
          <Link to="/#technologies" className={`${GENERAL_CTA} mt-7`}>
            Elegir una tecnología
          </Link>
        </section>
        {activity}
      </div>
    );
  }

  const priority = model.priorityConcept;
  const priorityName = priority ? nameOf(priority.conceptId) : undefined;
  const verdict = createDashboardVerdict(model, priorityName);

  return (
    <div className="space-y-10">
      <p className="border-b border-border pb-4 font-mono text-xs text-muted-foreground">
        codegym progress · {model.overview.totalAnswers} respuestas ·{' '}
        {model.overview.conceptsPracticed} conceptos practicados
      </p>

      <DiagnosisVerdict
        verdict={verdict}
        accuracy={priority?.accuracy ?? model.overview.globalAccuracy}
        totalAnswers={model.overview.totalAnswers}
      />

      {model.state === 'early' ? (
        <section aria-labelledby="continue-practising-title" className="border-t border-border pt-8">
          <h2 id="continue-practising-title" className="text-xl font-bold text-foreground">
            Sigue reuniendo evidencia
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Estos conceptos todavía tienen entre una y cuatro respuestas. Una práctica más puede hacer el diagnóstico más útil.
          </p>
          <Link to="/#technologies" className={`${GENERAL_CTA} mt-6`}>
            Continuar practicando
          </Link>
        </section>
      ) : resolvedRecommendation === null ? (
        <section aria-busy="true" aria-live="polite" className="border-t border-border pt-8">
          <h2 className="text-xl font-bold text-foreground">Preparando una práctica real…</h2>
        </section>
      ) : resolvedRecommendation.error !== null ? (
        <RecommendationUnavailable message={`No se pudo cargar la práctica recomendada: ${resolvedRecommendation.error}`} />
      ) : resolvedRecommendation.recommendation === null || priority?.status === undefined ? (
        <RecommendationUnavailable message="No hay una sesión disponible para este concepto." />
      ) : (
        <EvidencePiece
          conceptName={priorityName ?? priority.conceptId}
          status={priority.status}
          session={resolvedRecommendation.recommendation.session}
          step={resolvedRecommendation.recommendation.step}
        />
      )}

      <WeakConcepts
        concepts={namedOtherConcepts}
        observedConcepts={namedObservedConcepts}
      />
      {activity}
      <ProgressOverview overview={model.overview} />
      {resetAction}
    </div>
  );
}

function RecommendationUnavailable({ message }: { message: string }) {
  return (
    <section aria-labelledby="recommendation-unavailable-title" className="border-t border-border pt-8">
      <h2 id="recommendation-unavailable-title" className="text-xl font-bold text-foreground">
        Concepto prioritario
      </h2>
      <p role="alert" className="mt-3 border-l-4 border-destructive pl-4 text-sm text-destructive">
        {message}
      </p>
      <Link to="/#technologies" className={`${GENERAL_CTA} mt-6`}>
        Elegir otra práctica
      </Link>
    </section>
  );
}

export default DashboardPage;
