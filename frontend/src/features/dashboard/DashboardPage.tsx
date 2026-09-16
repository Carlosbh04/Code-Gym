import { useEffect, useMemo, useState } from 'react';
import { BrainCircuit, Clock3, FolderKanban, History, Target } from 'lucide-react';
import { Link } from 'react-router-dom';
import { EmptyState } from '@/components/codegym/EmptyState';
import { useContent } from '@/hooks/useContent';
import { useHistory } from '@/hooks/useHistory';
import { useProgress } from '@/hooks/useProgress';
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
  const [catalog, setCatalog] = useState<CatalogState>({ status: 'loading' });
  const [sessionDetails, setSessionDetails] = useState<SessionDetailsState>({ status: 'loading' });
  const [recommendationState, setRecommendationState] = useState<RecommendationState>({ conceptId: null, status: 'idle', session: null });

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
      const lastPracticedAt = progressItems
        .filter((progressItem) => progressItem.totalAttempts > 0)
        .map((progressItem) => progressItem.lastPracticed)
        .sort((left, right) => right.localeCompare(left))[0];
      return { technology: item.technology, totalConcepts: item.concepts.length, practicedConcepts: progressItems.filter((item) => item.totalAttempts > 0).length, totalAttempts, correctAttempts, accuracy: calculateAccuracy(correctAttempts, totalAttempts), lastPracticedAt };
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
    const historyAvailable = !completedSessionsLoading && completedSessionsError === null;
    const technologiesPracticed = technologyProgress.filter((item) => item.practicedConcepts > 0).length;
    const technologyTotal = technologyProgress.length;
    const catalogDescription = catalog.status === 'success'
      ? `De ${totalCatalogConcepts} conceptos`
      : 'Catálogo no disponible';
    const technologyDescription = catalog.status === 'success'
      ? `De ${technologyTotal} tecnologías`
      : 'Catálogo no disponible';
    return [
      {
        icon: History,
        label: 'Sesiones recientes',
        value: historyAvailable ? String(orderedSessions.length) : '—',
        description: historyAvailable ? 'Resultados guardados recientemente' : 'Historial no disponible',
        tone: 'success',
      },
      {
        icon: BrainCircuit,
        label: 'Conceptos practicados',
        value: String(model.overview.conceptsPracticed),
        description: catalogDescription,
        tone: 'primary',
      },
      {
        icon: FolderKanban,
        label: 'Tecnologías trabajadas',
        value: catalog.status === 'success' ? String(technologiesPracticed) : '—',
        description: technologyDescription,
        tone: 'warning',
      },
      {
        icon: Target,
        label: 'Precisión global',
        value: model.overview.globalAccuracy === undefined ? '—' : `${model.overview.globalAccuracy}%`,
        description: model.overview.globalAccuracy === undefined
          ? 'Sin respuestas registradas'
          : `${model.overview.totalCorrect} de ${model.overview.totalAnswers} respuestas correctas`,
        tone: 'success',
      },
      {
        icon: Clock3,
        label: 'Tiempo reciente',
        value: historyAvailable
          ? formatDuration(orderedSessions.reduce((total, item) => total + item.timeSpentMs, 0))
          : '—',
        description: historyAvailable ? 'Suma de las sesiones recientes' : 'Historial no disponible',
        tone: 'primary',
      },
    ];
  }, [catalog.status, completedSessionsError, completedSessionsLoading, model.overview, orderedSessions, technologyProgress, totalCatalogConcepts]);

  const hasActivity = progress.size > 0 || orderedSessions.length > 0;

  if (progressError !== null) return <section className="mx-auto w-full max-w-7xl space-y-5 py-2 sm:py-4"><DashboardError message={progressError} /><RecentActivity activities={activities} isLoading={completedSessionsLoading || sessionDetails.status === 'loading'} error={completedSessionsError} /></section>;

  const initialDashboardLoading =
    progressLoading
    || contentLoading;

  return (
    <section aria-labelledby="dashboard-title" className="mx-auto w-full max-w-7xl py-2 sm:py-4">
      <DashboardHeader
        latestActivity={activities[0]}
        isLoading={initialDashboardLoading}
      />
      {initialDashboardLoading ? (
        <DashboardLoadingBody
          metrics={metrics}
        />
      ) : !hasActivity && !completedSessionsLoading ? (
        <EmptyDashboard />
      ) : (
        <div className="mt-5 space-y-5">
          <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.8fr)_minmax(20rem,0.9fr)] xl:items-stretch">
            <DashboardProgressOverview practicedConcepts={totalPracticedCatalogConcepts} totalConcepts={totalCatalogConcepts} isLoading={catalog.status === 'loading'} error={catalog.status === 'error' ? catalog.message : null} />
            <NextPracticeCard recommendation={recommendation} isLoading={recommendationState.status === 'loading'} />
          </div>

          <section aria-label="Métricas de progreso" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {metrics.map((metric) => <DashboardMetricCard key={metric.label} {...metric} />)}
          </section>

          <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(22.5rem,0.8fr)] xl:items-start">
            <TechnologyProgressList items={technologyProgress} isLoading={catalog.status === 'loading'} error={catalog.status === 'error' ? catalog.message : null} />
            <aside className="min-w-0 space-y-5">
              <RecentActivity activities={activities} isLoading={completedSessionsLoading || sessionDetails.status === 'loading'} error={completedSessionsError} />
            </aside>
          </div>
        </div>
      )}
    </section>
  );
}

function DashboardLoadingBody({
  metrics,
}: {
  metrics: DashboardMetricCardProps[];
}) {
  return (
    <div
      role="region"
      aria-busy="true"
      aria-live="polite"
      aria-label="Cargando progreso"
      className="mt-5 space-y-5"
    >
      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.8fr)_minmax(20rem,0.9fr)] xl:items-stretch">
        <DashboardProgressOverview
          practicedConcepts={0}
          totalConcepts={0}
          isLoading
          error={null}
        />

        <NextPracticeCard
          recommendation={null}
          isLoading
        />
      </div>

      <section
        aria-label="Métricas de progreso"
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
      >
        {metrics.map((metric) => (
          <DashboardMetricCard
            key={metric.label}
            {...metric}
            isLoading
          />
        ))}
      </section>

      <div
        className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(22.5rem,0.8fr)] xl:items-start"
        style={{
          contentVisibility: 'auto',
          containIntrinsicSize: '700px',
        }}
      >
        <TechnologyProgressList
          items={[]}
          isLoading
          error={null}
        />

        <aside className="min-w-0 space-y-5">
          <RecentActivity
            activities={[]}
            isLoading
            error={null}
          />
        </aside>
      </div>
    </div>
  );
}


function DashboardError({ message }: { message: string }) {
  return <section aria-labelledby="dashboard-error-title" className="mx-auto max-w-2xl py-8 sm:py-12"><h1 id="dashboard-error-title" className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">No pudimos leer tu progreso</h1><p role="alert" className="mt-4 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">{message}</p><Link to="/tech" className={`${ACTION} mt-6`}>Explorar tecnologías</Link></section>;
}

function EmptyDashboard() {
  return <EmptyState title="Aún no tienes actividad" description="Empieza una sesión para que tu progreso aparezca aquí." action={<Link to="/tech" className={ACTION}>Empezar a entrenar</Link>} className="mt-5 max-w-none rounded-2xl border border-border bg-card shadow-sm" />;
}

export default DashboardPage;
