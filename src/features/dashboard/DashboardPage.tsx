import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { BrainCircuit, CheckCircle2, Clock3, FolderKanban } from 'lucide-react';
import { Link } from 'react-router-dom';
import { EmptyState } from '@/components/codegym/EmptyState';
import { useContent } from '@/hooks/useContent';
import { useDialogFocus } from '@/hooks/useDialogFocus';
import { useHistory } from '@/hooks/useHistory';
import { useProgress } from '@/hooks/useProgress';
import { useResetProgress } from '@/hooks/useResetProgress';
import type { ExerciseSession } from '@/types/exercise';
import { calculateAccuracy, createDashboardViewModel, selectRecommendedSession } from './dashboard-view-model';
import { DashboardHeader } from './components/DashboardHeader';
import { DashboardMetricCard, type DashboardMetricCardProps } from './components/DashboardMetricCard';
import { DashboardProgressOverview } from './components/DashboardProgressOverview';
import { NextPracticeCard } from './components/NextPracticeCard';
import { RecentActivity } from './components/RecentActivity';
import { formatDuration } from './components/dashboard-formatters';
import { TechnologyProgressList } from './components/TechnologyProgressList';
import type { CatalogTechnology, DashboardActivity, DashboardRecommendation, TechnologyProgress } from './components/dashboard-types';

type CatalogState =
  | { status: 'loading' }
  | { status: 'success'; technologies: CatalogTechnology[] }
  | { status: 'error'; message: string };
type SessionDetailsState = { status: 'loading' } | { status: 'success'; sessions: Map<string, ExerciseSession | null> };
type RecommendationState = { conceptId: string | null; status: 'idle' | 'loading' | 'success'; session: ExerciseSession | null };

const ACTION = 'inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

function DashboardPage() {
  const { progress, isLoading: progressLoading, error: progressError } = useProgress();
  const { recentCompletedSessions, completedSessionsLoading, completedSessionsError } = useHistory();
  const { technologies, getConceptsByTopic, getSession, getSessionsByConcept, getTechnology, getTopics, isLoading: contentLoading } = useContent();
  const { resetProgress } = useResetProgress();
  const [catalog, setCatalog] = useState<CatalogState>({ status: 'loading' });
  const [sessionDetails, setSessionDetails] = useState<SessionDetailsState>({ status: 'loading' });
  const [recommendationState, setRecommendationState] = useState<RecommendationState>({ conceptId: null, status: 'idle', session: null });
  const [resetOpen, setResetOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const resetDialogRef = useRef<HTMLDivElement>(null);
  useDialogFocus(resetOpen, resetDialogRef);

  const model = useMemo(() => createDashboardViewModel(progress.values()), [progress]);
  const orderedSessions = useMemo(() => [...recentCompletedSessions].sort((left, right) => right.completedAt.localeCompare(left.completedAt)), [recentCompletedSessions]);

  useEffect(() => {
    if (progressLoading || contentLoading) return;
    let active = true;
    void Promise.resolve().then(() => {
      if (active) setCatalog({ status: 'loading' });
      return Promise.all(technologies.map(async (technology) => {
      const topics = await getTopics(technology.id);
      const concepts = (await Promise.all(topics.map((topic) => getConceptsByTopic(topic.id)))).flat();
      return { technology, topics, concepts };
      }));
    }).then((items) => {
      if (active) setCatalog({ status: 'success', technologies: items });
    }).catch((error: unknown) => {
      if (active) setCatalog({ status: 'error', message: error instanceof Error ? error.message : String(error) });
    });
    return () => { active = false; };
  }, [contentLoading, getConceptsByTopic, getTopics, progressLoading, technologies]);

  useEffect(() => {
    if (progressLoading) return;
    let active = true;
    if (completedSessionsLoading || orderedSessions.length === 0) {
      void Promise.resolve().then(() => {
        if (active) setSessionDetails({ status: 'success', sessions: new Map() });
      });
      return () => { active = false; };
    }
    void Promise.resolve().then(() => {
      if (active) setSessionDetails({ status: 'loading' });
      return Promise.all(orderedSessions.map(async (completed) => [completed.sessionId, await Promise.resolve(getSession(completed.sessionId)).catch(() => null)] as const));
    }).then((entries) => {
      if (active) setSessionDetails({ status: 'success', sessions: new Map(entries) });
    });
    return () => { active = false; };
  }, [completedSessionsLoading, getSession, orderedSessions, progressLoading]);

  const catalogConcepts = useMemo(() => catalog.status === 'success' ? catalog.technologies.flatMap((item) => item.concepts) : [], [catalog]);
  const technologyProgress = useMemo<TechnologyProgress[]>(() => {
    if (catalog.status !== 'success') return [];
    return catalog.technologies.filter((item) => item.concepts.length > 0).map((item) => {
      const progressItems = item.concepts.map((concept) => progress.get(concept.id)).filter((item): item is NonNullable<typeof item> => item !== undefined);
      const totalAttempts = progressItems.reduce((total, item) => total + item.totalAttempts, 0);
      const correctAttempts = progressItems.reduce((total, item) => total + item.correctAttempts, 0);
      return { technology: item.technology, totalConcepts: item.concepts.length, practicedConcepts: progressItems.filter((item) => item.totalAttempts > 0).length, totalAttempts, correctAttempts, accuracy: calculateAccuracy(correctAttempts, totalAttempts) };
    });
  }, [catalog, progress]);
  const totalCatalogConcepts = technologyProgress.reduce((total, item) => total + item.totalConcepts, 0);
  const totalPracticedCatalogConcepts = technologyProgress.reduce((total, item) => total + item.practicedConcepts, 0);

  const activities = useMemo<DashboardActivity[]>(() => orderedSessions.map((completedSession) => {
    const session = sessionDetails.status === 'success' ? sessionDetails.sessions.get(completedSession.sessionId) ?? null : null;
    const concept = catalogConcepts.find((item) => item.id === completedSession.conceptId);
    const technology = getTechnology(completedSession.technologyId);
    const topic = catalog.status === 'success' && concept ? catalog.technologies.flatMap((item) => item.topics).find((item) => item.id === concept.topicId) : undefined;
    return { completedSession, sessionTitle: session?.title ?? completedSession.sessionId, technologyName: technology?.name ?? completedSession.technologyId, topicName: topic?.name };
  }), [catalog, catalogConcepts, getTechnology, orderedSessions, sessionDetails]);

  const nextConcept = useMemo(() => {
    if (model.priorityConcept) return model.priorityConcept;
    return [...model.observedConcepts].sort((left, right) => right.lastPracticed.localeCompare(left.lastPracticed))[0] ?? null;
  }, [model.observedConcepts, model.priorityConcept]);
  useEffect(() => {
    if (progressLoading) return;
    let active = true;
    if (catalog.status !== 'success' || nextConcept === null) {
      void Promise.resolve().then(() => {
        if (active) setRecommendationState({ conceptId: nextConcept?.conceptId ?? null, status: 'idle', session: null });
      });
      return () => { active = false; };
    }
    void Promise.resolve().then(() => {
      if (active) setRecommendationState({ conceptId: nextConcept.conceptId, status: 'loading', session: null });
      return getSessionsByConcept(nextConcept.conceptId);
    }).then((sessions) => {
      if (active) setRecommendationState({ conceptId: nextConcept.conceptId, status: 'success', session: selectRecommendedSession(sessions) });
    }).catch(() => {
      if (active) setRecommendationState({ conceptId: nextConcept.conceptId, status: 'success', session: null });
    });
    return () => { active = false; };
  }, [catalog.status, getSessionsByConcept, nextConcept, progressLoading]);

  const recommendation = useMemo<DashboardRecommendation | null>(() => {
    if (nextConcept === null || recommendationState.conceptId !== nextConcept.conceptId || recommendationState.session === null) return null;
    const concept = catalogConcepts.find((item) => item.id === nextConcept.conceptId);
    const technology = concept ? getTechnology(concept.technologyId) : undefined;
    return { conceptName: concept?.name ?? nextConcept.conceptId, technologyName: technology?.name ?? concept?.technologyId ?? '', session: recommendationState.session };
  }, [catalogConcepts, getTechnology, nextConcept, recommendationState]);

  const metrics = useMemo<DashboardMetricCardProps[]>(() => {
    const values: DashboardMetricCardProps[] = [];
    if (!completedSessionsLoading && completedSessionsError === null && orderedSessions.length > 0) values.push({ icon: CheckCircle2, label: 'Sesiones recientes', value: String(orderedSessions.length), description: 'Resultados guardados recientemente' });
    if (model.overview.conceptsPracticed > 0) values.push({ icon: BrainCircuit, label: 'Conceptos practicados', value: String(model.overview.conceptsPracticed) });
    const technologiesPracticed = technologyProgress.filter((item) => item.practicedConcepts > 0).length;
    if (technologiesPracticed > 0) values.push({ icon: FolderKanban, label: 'Tecnologías trabajadas', value: String(technologiesPracticed) });
    if (model.overview.globalAccuracy !== undefined) values.push({ icon: CheckCircle2, label: 'Precisión global', value: `${model.overview.globalAccuracy}%`, description: `${model.overview.totalCorrect} de ${model.overview.totalAnswers} respuestas correctas` });
    if (!completedSessionsLoading && completedSessionsError === null && orderedSessions.length > 0) values.push({ icon: Clock3, label: 'Tiempo reciente', value: formatDuration(orderedSessions.reduce((total, item) => total + item.timeSpentMs, 0)), description: 'Suma de las sesiones recientes guardadas' });
    return values;
  }, [completedSessionsError, completedSessionsLoading, model.overview, orderedSessions, technologyProgress]);

  const hasActivity = progress.size > 0 || orderedSessions.length > 0;
  const confirmReset = async () => {
    if (resetting) return;
    setResetting(true); setResetError(null);
    try { await resetProgress(); setResetOpen(false); }
    catch (error) { setResetError(error instanceof Error ? error.message : String(error)); }
    finally { setResetting(false); }
  };

  if (progressLoading) return <DashboardLoading />;
  if (progressError !== null) return <section className="mx-auto w-full max-w-7xl space-y-5 py-2 sm:py-4"><DashboardError message={progressError} /><RecentActivity activities={activities} isLoading={completedSessionsLoading || sessionDetails.status === 'loading'} error={completedSessionsError} /><ResetProgress resetOpen={resetOpen} resetting={resetting} resetError={resetError} dialogRef={resetDialogRef} onOpen={() => setResetOpen(true)} onClose={() => setResetOpen(false)} onConfirm={confirmReset} /></section>;

  return (
    <section aria-labelledby="dashboard-title" className="mx-auto w-full max-w-7xl py-2 sm:py-4">
      <DashboardHeader latestActivity={activities[0]} />
      {!hasActivity && !completedSessionsLoading ? <EmptyDashboard /> : <div className="mt-5 space-y-5"><div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(18rem,0.75fr)] lg:items-start"><div className="min-w-0 space-y-5"><DashboardProgressOverview practicedConcepts={totalPracticedCatalogConcepts} totalConcepts={totalCatalogConcepts} isLoading={catalog.status === 'loading'} error={catalog.status === 'error' ? catalog.message : null} />{metrics.length > 0 ? <section aria-label="Métricas de progreso" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{metrics.map((metric) => <DashboardMetricCard key={metric.label} {...metric} />)}</section> : null}<TechnologyProgressList items={technologyProgress} isLoading={catalog.status === 'loading'} error={catalog.status === 'error' ? catalog.message : null} /></div><aside className="min-w-0"><NextPracticeCard recommendation={recommendation} isLoading={recommendationState.status === 'loading'} /></aside></div><RecentActivity activities={activities} isLoading={completedSessionsLoading || sessionDetails.status === 'loading'} error={completedSessionsError} /><ResetProgress resetOpen={resetOpen} resetting={resetting} resetError={resetError} dialogRef={resetDialogRef} onOpen={() => setResetOpen(true)} onClose={() => setResetOpen(false)} onConfirm={confirmReset} /></div>}
    </section>
  );
}

function DashboardLoading() {
  return <section aria-busy="true" aria-live="polite" aria-labelledby="dashboard-loading-title" className="mx-auto max-w-7xl space-y-5 py-8 sm:py-12"><div className="h-5 w-24 rounded bg-muted" /><h1 id="dashboard-loading-title" className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Cargando progreso…</h1><div className="h-40 rounded-2xl border border-border bg-card" /></section>;
}

function DashboardError({ message }: { message: string }) {
  return <section aria-labelledby="dashboard-error-title" className="mx-auto max-w-2xl py-8 sm:py-12"><h1 id="dashboard-error-title" className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">No pudimos leer tu progreso</h1><p role="alert" className="mt-4 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">{message}</p><Link to="/#technologies" className={`${ACTION} mt-6`}>Explorar tecnologías</Link></section>;
}

function EmptyDashboard() {
  return <EmptyState title="Aún no tienes actividad" description="Empieza una sesión para que tu progreso aparezca aquí." action={<Link to="/#technologies" className={ACTION}>Empezar a entrenar</Link>} className="mt-5 max-w-none rounded-2xl border border-border bg-card shadow-sm" />;
}

function ResetProgress({ resetOpen, resetting, resetError, dialogRef, onOpen, onClose, onConfirm }: { resetOpen: boolean; resetting: boolean; resetError: string | null; dialogRef: RefObject<HTMLDivElement>; onOpen: () => void; onClose: () => void; onConfirm: () => Promise<void> }) {
  return <section aria-labelledby="reset-progress-title" className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6"><h2 id="reset-progress-title" className="text-sm font-semibold text-foreground">Restablecer progreso</h2><p className="mt-2 text-sm leading-relaxed text-muted-foreground">Elimina los datos de práctica guardados en este dispositivo.</p><button type="button" className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl border border-destructive/50 px-4 py-2 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" onClick={onOpen}>Restablecer progreso</button>{resetOpen ? <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="reset-dialog-title" aria-describedby="reset-dialog-description" className="mt-4 max-w-lg rounded-xl border border-destructive/40 bg-background p-5 shadow-lg"><h3 id="reset-dialog-title" className="font-semibold text-foreground">¿Restablecer progreso?</h3><p id="reset-dialog-description" className="mt-2 text-sm leading-relaxed text-muted-foreground">Se eliminarán tu progreso, intentos y sesiones completadas guardadas en este dispositivo. Esta acción no se puede deshacer.</p>{resetError ? <p role="alert" className="mt-3 text-sm text-destructive">No se pudo restablecer el progreso: {resetError}</p> : null}<div className="mt-5 flex flex-wrap gap-3"><button type="button" disabled={resetting} onClick={onClose} className="min-h-11 rounded-xl border border-border px-4 py-2 text-sm font-semibold text-foreground disabled:opacity-60">Cancelar</button><button type="button" disabled={resetting} onClick={() => { void onConfirm(); }} className="min-h-11 rounded-xl bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground disabled:opacity-60">{resetting ? 'Restableciendo…' : 'Restablecer progreso'}</button></div></div> : null}</section>;
}

export default DashboardPage;
