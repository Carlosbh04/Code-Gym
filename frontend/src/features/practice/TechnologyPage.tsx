import { useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';

import { EmptyState } from '@/components/codegym/EmptyState';
import { Skeleton } from '@/components/codegym/Skeleton';
import { browserLearningApi } from '@/features/learning/learning-api';
import {
  getHistoryTechnologyCompletedSessions,
} from '@/features/history/history-api';
import {
  adaptHistoryCompletedSession,
} from '@/features/history/history-adapters';
import { useAuth } from '@/features/auth/AuthContext';
import { useContent } from '@/hooks/useContent';
import { useHistory } from '@/hooks/useHistory';
import { useProgress } from '@/hooks/useProgress';
import { TechnologyHeader } from './components/TechnologyHeader';
import { TechnologyExerciseList } from './components/TechnologyExerciseList';
import { TechnologyProgressSummary } from './components/TechnologyProgressSummary';
import { TechnologyResults } from './components/TechnologyResults';
import { TechnologyTabs, type TechnologyTab } from './components/TechnologyTabs';
import { TopicList } from './components/TopicList';
import {
  buildTechnologyViewModel,
  type TechnologyViewModel,
} from './technology-page-model';

type TechnologyModel =
  | (TechnologyViewModel & { status: 'success' })
  | { technologyId: string; status: 'error'; message: string };

function TechnologyPage() {
  const { technologyId } = useParams<{ technologyId: string }>();
  const [searchParams] = useSearchParams();
  const {
    getTechnology,
    getTopics,
    getConceptsByTopic,
    getSessionsByConcept,
    isLoading,
  } = useContent();
  const { getCompletedSession } = useHistory();
  const { progress } = useProgress();
  const { accessToken } = useAuth();
  const technology = technologyId ? getTechnology(technologyId) : undefined;
  const activeTab = resolveTechnologyTab(searchParams.get('tab'));
  const [model, setModel] = useState<TechnologyModel | null>(null);

  /*
   * TECHNOLOGY_SNAPSHOT_REQUEST_DEDUPE
   *
   * El view-model puede recalcularse si cambia progress u otra
   * dependencia local. Eso no debe volver a pedir los mismos
   * snapshots remotos mientras usuario + tecnología no cambien.
   */
  const technologySnapshotRef =
    useRef<{
      readonly key: string;

      readonly learning:
        ReturnType<
          typeof browserLearningApi.getTechnologyState
        >;

      readonly history:
        ReturnType<
          typeof getHistoryTechnologyCompletedSessions
        >;
    } | null>(
      null,
    );

  useEffect(() => {
    if (isLoading || technology === undefined || technologyId === undefined) return;
    let active = true;

    /*
     * TECHNOLOGY_SNAPSHOT_HTTP_FANOUT_FIX
     *
     * Solo se crean dos requests de progreso/historial.
     * buildTechnologyViewModel conserva su lógica actual y
     * consume lookups locales derivados de estos snapshots.
     */
    const snapshot =
      accessToken === null
        ? null
        : (() => {
            const key =
              JSON.stringify([
                accessToken,
                technologyId,
              ]);

            const cached =
              technologySnapshotRef
                .current;

            if (
              cached !== null
              && cached.key === key
            ) {
              return cached;
            }

            const next = {
              key,

              learning:
                browserLearningApi
                  .getTechnologyState(
                    technologyId,
                    accessToken,
                  ),

              history:
                getHistoryTechnologyCompletedSessions(
                  accessToken,
                  technologyId,
                ),
            };

            technologySnapshotRef
              .current =
                next;

            return next;
          })();

    if (
      accessToken === null
      && technologySnapshotRef.current
        !== null
    ) {
      technologySnapshotRef.current =
        null;
    }

    const technologyLearningSnapshotPromise =
      snapshot?.learning
      ?? null;

    const technologyHistorySnapshotPromise =
      snapshot?.history
      ?? null;

    void buildTechnologyViewModel({
      technologyId,
      getTopics,
      getConceptsByTopic,
      getSessionsByConcept,

      getCompletedSession:
        technologyHistorySnapshotPromise === null
          ? getCompletedSession
          : async sessionId => {
              const response =
                await technologyHistorySnapshotPromise;

              const completedSession =
                response.completedSessions.find(
                  item =>
                    item.sessionId
                    === sessionId,
                );

              return completedSession === undefined
                ? null
                : adaptHistoryCompletedSession(
                    completedSession,
                  );
            },

      progress,

      // CANONICAL_TOPIC_PROGRESS
      getConceptLearningState:
        technologyLearningSnapshotPromise === null
          ? undefined
          : async conceptId => {
              const snapshot =
                await technologyLearningSnapshotPromise;

              const concept =
                snapshot.concepts.find(
                  item =>
                    item.conceptId
                    === conceptId,
                );

              if (concept === undefined) {
                throw new Error(
                  `No canonical learning state for concept ${conceptId}`,
                );
              }

              return concept.state;
            },

      // TECHNOLOGY_PRACTICE_CANONICAL_GATE
      getSessionLearningState:
        technologyLearningSnapshotPromise === null
          ? undefined
          : async (
              conceptId,
              levelId,
            ) => {
              const snapshot =
                await technologyLearningSnapshotPromise;

              const concept =
                snapshot.concepts.find(
                  item =>
                    item.conceptId
                    === conceptId,
                );

              const level =
                concept?.levels.find(
                  item =>
                    item.levelId
                    === levelId,
                );

              if (level === undefined) {
                throw new Error(
                  `No canonical ${levelId} state for concept ${conceptId}`,
                );
              }

              return level;
            },
    })
      .then((nextModel) => {
        if (active) setModel({ ...nextModel, status: 'success' });
      })
      .catch((error: unknown) => {
        if (active) {
          setModel({
            technologyId,
            status: 'error',
            message:
              error instanceof Error
                ? error.message
                : 'No se pudieron cargar los temas y su progreso.',
          });
        }
      });

    return () => {
      active = false;
    };
  }, [
    accessToken,
    getCompletedSession,
    getConceptsByTopic,
    getSessionsByConcept,
    getTopics,
    isLoading,
    progress,
    technology,
    technologyId,
  ]);

  if (isLoading) {
    return <TechnologyLoading activeTab={activeTab} />;
  }
  if (technology === undefined || technologyId === undefined) {
    return <TechnologyUnavailable />;
  }

  const currentModel = model?.technologyId === technologyId ? model : null;

  return (
    <section
      aria-labelledby="technology-title"
      className="mx-auto w-full max-w-7xl py-2 sm:py-4"
    >
      <TechnologyHeader technology={technology} />

      {currentModel?.status === 'success' ? (
        <TechnologyProgressSummary
          technologyName={technology.name}
          completedConcepts={currentModel.completedConcepts}
          totalConcepts={currentModel.totalConcepts}
          completionErrors={currentModel.completionErrors}
          nextPractice={currentModel.nextPractice}
        />
      ) : currentModel === null ? (
        <TechnologyProgressLoading />
      ) : null}

      <TechnologyTabs technologyId={technologyId} activeTab={activeTab} />

      {currentModel === null ? (
        <TechnologyTabLoading activeTab={activeTab} />
      ) : currentModel.status === 'error' ? (
        <p
          role="alert"
          className="mt-3 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive sm:mt-4"
        >
          No pudimos cargar esta tecnología. {currentModel.message}
        </p>
      ) : activeTab === 'exercises' ? (
        <TechnologyExerciseList
          technologyName={technology.name}
          sessions={currentModel.practiceSessions}
        />
      ) : activeTab === 'results' ? (
        <TechnologyResults technology={technology} model={currentModel} />
      ) : (
        <TopicsTab
          technologyId={technologyId}
          technologyName={technology.name}
          model={currentModel}
        />
      )}
    </section>
  );
}

function TopicsTab({
  technologyId,
  technologyName,
  model,
}: {
  technologyId: string;
  technologyName: string;
  model: TechnologyViewModel;
}) {
  return (
    <section aria-labelledby="topics-heading" className="mt-3 sm:mt-4">
      <h2 id="topics-heading" className="sr-only">
        Temas de {technologyName}
      </h2>
      {model.topics.length === 0 ? (
        <EmptyState
          title="Todavía no hay temas disponibles"
          description="Esta tecnología está disponible, pero aún no tiene temas preparados para practicar."
          className="rounded-2xl border border-border bg-card"
        />
      ) : (
        <TopicList
          technologyId={technologyId}
          topics={model.topics}
          insights={model.insights}
        />
      )}
    </section>
  );
}

function resolveTechnologyTab(value: string | null): TechnologyTab {
  return value === 'exercises' || value === 'results' ? value : 'topics';
}

function TechnologyProgressLoading() {
  return (
    <div
      aria-hidden="true"
      className="mt-6 overflow-hidden rounded-2xl border border-border bg-card shadow-sm sm:mt-7"
    >
      <div className="grid md:grid-cols-2 xl:grid-cols-[1.1fr_0.72fr_1.25fr]">
        <div className="p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <Skeleton className="size-4 rounded-md" />
            <Skeleton className="h-3 w-24" />
          </div>

          <div className="mt-4 flex items-end justify-between gap-4">
            <Skeleton className="h-10 w-20" />

            <div className="flex-1 space-y-2">
              <Skeleton className="ml-auto h-3 w-36 max-w-full" />
              <Skeleton className="ml-auto h-3 w-28 max-w-full" />
            </div>
          </div>

          <Skeleton className="mt-4 h-2 w-full rounded-full" />
        </div>

        <div className="border-t border-border p-5 sm:p-6 md:border-l md:border-t-0">
          <div className="flex items-center gap-2">
            <Skeleton className="size-4 rounded-md" />
            <Skeleton className="h-3 w-36" />
          </div>

          <div className="mt-5 flex items-end gap-2">
            <Skeleton className="h-8 w-12" />
            <Skeleton className="h-5 w-12" />
          </div>

          <Skeleton className="mt-3 h-3 w-full max-w-52" />
        </div>

        <div className="border-t border-border p-5 sm:p-6 md:col-span-2 xl:col-span-1 xl:border-l xl:border-t-0">
          <div className="flex items-center gap-2">
            <Skeleton className="size-4 rounded-md" />
            <Skeleton className="h-3 w-28" />
          </div>

          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0 flex-1">
              <Skeleton className="h-4 w-4/5 max-w-64" />
              <Skeleton className="mt-2 h-3 w-24" />
            </div>

            <Skeleton className="h-11 w-28 shrink-0 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}

function TechnologyTabsLoading() {
  return (
    <div
      aria-hidden="true"
      className="mt-5 border-b border-border sm:mt-6"
    >
      <div className="flex gap-1">
        {Array.from({ length: 3 }, (_, index) => (
          <div
            key={index}
            className="flex min-h-12 items-center gap-2 px-3"
          >
            <Skeleton className="size-4 rounded-md" />
            <Skeleton
              className={
                index === 1
                  ? 'h-4 w-20'
                  : 'h-4 w-16'
              }
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function TechnologyTabLoading({
  activeTab,
}: {
  activeTab: TechnologyTab;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="mt-3 sm:mt-4"
    >
      <span className="sr-only">
        Cargando contenido y progreso…
      </span>

      {activeTab === 'exercises' ? (
        <TechnologyExercisesLoading />
      ) : activeTab === 'results' ? (
        <TechnologyResultsLoading />
      ) : (
        <TechnologyTopicsLoading />
      )}
    </div>
  );
}

function TechnologyTopicsLoading() {
  return (
    <div
      aria-hidden="true"
      className="space-y-2.5"
    >
      {Array.from({ length: 4 }, (_, index) => (
        <div
          key={index}
          className="grid min-h-11 grid-cols-[3rem_minmax(0,1fr)] gap-x-3 gap-y-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-[3rem_minmax(0,1fr)_auto] sm:gap-x-4 xl:grid-cols-[3rem_minmax(15rem,1fr)_9rem_minmax(8rem,10rem)_8rem_1.5rem] xl:items-center xl:gap-x-5"
        >
          <Skeleton className="size-12 rounded-xl" />

          <div className="min-w-0">
            <Skeleton className="h-5 w-36 max-w-full" />
            <Skeleton className="mt-2 h-3 w-full max-w-80" />
          </div>

          <div className="col-start-2 space-y-2 sm:row-start-2 xl:col-auto xl:row-auto">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-16" />
          </div>

          <div className="col-span-2 sm:col-start-2 xl:col-auto">
            <div className="flex justify-between gap-3">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-10" />
            </div>
            <Skeleton className="mt-2 h-1.5 w-full rounded-full" />
          </div>

          <Skeleton className="col-start-2 h-8 w-24 rounded-full sm:col-start-3 xl:col-auto" />
          <Skeleton className="hidden size-5 rounded-md xl:block" />
        </div>
      ))}
    </div>
  );
}

function TechnologyExercisesLoading() {
  return (
    <div aria-hidden="true">
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 flex-1">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-2 h-6 w-56 max-w-full" />
            <Skeleton className="mt-2 h-3 w-72 max-w-full" />
          </div>

          <div className="flex gap-2 overflow-hidden">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton
                key={index}
                className="h-11 w-24 shrink-0 rounded-full"
              />
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-4">
        {Array.from({ length: 2 }, (_, groupIndex) => (
          <div
            key={groupIndex}
            className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5"
          >
            <Skeleton className="h-5 w-36" />

            <div className="mt-3 space-y-3">
              {Array.from({ length: 2 }, (_, rowIndex) => (
                <div
                  key={rowIndex}
                  className="rounded-xl border border-border bg-background p-4 sm:p-5"
                >
                  <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                    <div className="grid min-w-0 grid-cols-[2.75rem_minmax(0,1fr)] gap-3">
                      <Skeleton className="size-11 rounded-full" />

                      <div className="min-w-0">
                        <Skeleton className="h-3 w-28" />
                        <Skeleton className="mt-2 h-5 w-3/4 max-w-72" />

                        <div className="mt-3 flex flex-wrap gap-2">
                          <Skeleton className="h-7 w-24 rounded-full" />
                          <Skeleton className="h-7 w-20 rounded-full" />
                          <Skeleton className="h-3 w-20 self-center" />
                        </div>
                      </div>
                    </div>

                    <Skeleton className="h-11 w-32 rounded-lg" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TechnologyResultsLoading() {
  return (
    <div aria-hidden="true">
      <Skeleton className="h-3 w-28" />
      <Skeleton className="mt-2 h-6 w-52 max-w-full" />
      <Skeleton className="mt-2 h-3 w-72 max-w-full" />

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className="rounded-xl border border-border bg-card p-4 shadow-sm"
          >
            <div className="flex items-center gap-2">
              <Skeleton className="size-4 rounded-md" />
              <Skeleton className="h-3 w-28" />
            </div>
            <Skeleton className="mt-3 h-7 w-16" />
          </div>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        {Array.from({ length: 3 }, (_, index) => (
          <div
            key={index}
            className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5"
          >
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
              <div className="min-w-0">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="mt-2 h-5 w-2/3 max-w-72" />
                <Skeleton className="mt-2 h-3 w-36" />

                <div className="mt-3 flex flex-wrap gap-3">
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-8 w-20" />
                  <Skeleton className="h-8 w-20" />
                  <Skeleton className="h-8 w-24" />
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 lg:w-auto">
                <Skeleton className="h-11 w-32 rounded-lg" />
                <Skeleton className="h-11 w-28 rounded-lg" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TechnologyLoading({
  activeTab,
}: {
  activeTab: TechnologyTab;
}) {
  return (
    <section
      aria-busy="true"
      aria-labelledby="technology-loading-title"
      aria-live="polite"
      className="mx-auto w-full max-w-7xl py-2 sm:py-4"
    >
      <h1
        id="technology-loading-title"
        className="sr-only"
      >
        Cargando tecnología…
      </h1>

      <div aria-hidden="true">
        <div className="flex items-start justify-between gap-4 sm:gap-6">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="size-4 rounded-md" />
              <Skeleton className="h-4 w-24" />
            </div>

            <Skeleton className="mt-3 h-10 w-64 max-w-full sm:h-12" />

            <div className="mt-3 space-y-2">
              <Skeleton className="h-4 w-full max-w-3xl" />
              <Skeleton className="h-4 w-4/5 max-w-2xl" />
            </div>
          </div>

          <Skeleton className="mt-11 size-14 shrink-0 rounded-xl sm:size-20" />
        </div>
      </div>

      <TechnologyProgressLoading />
      <TechnologyTabsLoading />
      <TechnologyTabLoading activeTab={activeTab} />
    </section>
  );
}

function TechnologyUnavailable() {
  return (
    <section aria-labelledby="technology-unavailable-title" className="max-w-2xl py-8 sm:py-12">
      <h1
        id="technology-unavailable-title"
        className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
      >
        Tecnología no disponible
      </h1>
      <p className="mt-4 text-base leading-relaxed text-muted-foreground">
        No hemos encontrado la tecnología solicitada.
      </p>
      <Link
        to="/tech"
        className="mt-7 inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        Volver a tecnologías
      </Link>
    </section>
  );
}

export default TechnologyPage;
