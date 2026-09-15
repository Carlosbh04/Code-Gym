import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';

import { EmptyState } from '@/components/codegym/EmptyState';
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
  const technology = technologyId ? getTechnology(technologyId) : undefined;
  const activeTab = resolveTechnologyTab(searchParams.get('tab'));
  const [model, setModel] = useState<TechnologyModel | null>(null);

  useEffect(() => {
    if (isLoading || technology === undefined || technologyId === undefined) return;
    let active = true;

    void buildTechnologyViewModel({
      technologyId,
      getTopics,
      getConceptsByTopic,
      getSessionsByConcept,
      getCompletedSession,
      progress,
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
    getCompletedSession,
    getConceptsByTopic,
    getSessionsByConcept,
    getTopics,
    isLoading,
    progress,
    technology,
    technologyId,
  ]);

  if (isLoading) return <TechnologyLoading />;
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
        <div
          role="status"
          aria-live="polite"
          className="mt-3 rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground sm:mt-4"
        >
          Cargando contenido y progreso…
        </div>
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
          sessions={currentModel.sessions}
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
      role="status"
      aria-live="polite"
      className="mt-6 rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground"
    >
      Calculando tu progreso real…
    </div>
  );
}

function TechnologyLoading() {
  return (
    <section
      aria-busy="true"
      aria-labelledby="technology-loading-title"
      aria-live="polite"
      className="mx-auto max-w-7xl py-8 sm:py-12"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Entrenar</p>
      <h1
        id="technology-loading-title"
        className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
      >
        Cargando tecnología…
      </h1>
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
        to="/#technologies"
        className="mt-7 inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        Volver a tecnologías
      </Link>
    </section>
  );
}

export default TechnologyPage;
