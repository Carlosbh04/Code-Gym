import { useEffect, useState } from 'react';
import { BookOpen } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { EmptyState } from '@/components/codegym/EmptyState';
import { useContent } from '@/hooks/useContent';
import { useProgress } from '@/hooks/useProgress';
import type { Concept, Topic } from '@/types/content';
import { LearningContent } from './components/LearningContent';
import { TopicHeader } from './components/TopicHeader';
import { TopicSessionList, type TopicSessionResult } from './components/TopicSessionList';

type TopicsResult =
  | { technologyId: string; status: 'success'; topics: Topic[] }
  | { technologyId: string; status: 'error'; message: string };

type ConceptsResult =
  | { topicId: string; status: 'success'; concepts: Concept[] }
  | { topicId: string; status: 'error'; message: string };

type SessionsResult = TopicSessionResult;

function TopicPage() {
  const { technologyId, topicId } = useParams<{
    technologyId: string;
    topicId: string;
  }>();
  const { getTechnology, getTopics, getConceptsByTopic, getSessionsByConcept, isLoading } =
    useContent();
  const { progress } = useProgress();
  const technology = technologyId ? getTechnology(technologyId) : undefined;
  const [topicsResult, setTopicsResult] = useState<TopicsResult | null>(null);
  const [conceptsResult, setConceptsResult] =
    useState<ConceptsResult | null>(null);
  const [sessionsByConcept, setSessionsByConcept] = useState<Record<string, SessionsResult>>({});

  useEffect(() => {
    if (isLoading || technology === undefined || technologyId === undefined) {
      return;
    }

    let active = true;
    void getTopics(technologyId)
      .then((topics) => {
        if (active) setTopicsResult({ technologyId, status: 'success', topics });
      })
      .catch((error: unknown) => {
        if (active) {
          setTopicsResult({
            technologyId,
            status: 'error',
            message:
              error instanceof Error ? error.message : 'No se pudieron cargar los temas.',
          });
        }
      });

    return () => {
      active = false;
    };
  }, [getTopics, isLoading, technology, technologyId]);

  const currentTopics =
    topicsResult?.technologyId === technologyId ? topicsResult : null;
  const topic =
    currentTopics?.status === 'success' && topicId !== undefined
      ? currentTopics.topics.find((candidate) => candidate.id === topicId)
      : undefined;

  useEffect(() => {
    if (topic === undefined) return;

    let active = true;
    void getConceptsByTopic(topic.id)
      .then((concepts) => {
        if (active) setConceptsResult({ topicId: topic.id, status: 'success', concepts });
      })
      .catch((error: unknown) => {
        if (active) {
          setConceptsResult({
            topicId: topic.id,
            status: 'error',
            message:
              error instanceof Error
                ? error.message
                : 'No se pudieron cargar los conceptos.',
          });
        }
      });

    return () => {
      active = false;
    };
  }, [getConceptsByTopic, topic]);

  const currentConcepts =
    conceptsResult?.topicId === topic?.id ? conceptsResult : null;

  useEffect(() => {
    if (currentConcepts?.status !== 'success') return;

    let active = true;
    void Promise.all(
      currentConcepts.concepts.map(async (concept) => {
        try {
          const sessions = await getSessionsByConcept(concept.id);
          return [
            concept.id,
            { status: 'success', sessions: Array.isArray(sessions) ? sessions : [] } as SessionsResult,
          ] as const;
        } catch (error: unknown) {
          return [
            concept.id,
            {
              status: 'error',
              message: error instanceof Error ? error.message : 'No se pudieron cargar las sesiones.',
            } as SessionsResult,
          ] as const;
        }
      }),
    ).then((entries) => {
      if (active) setSessionsByConcept(Object.fromEntries(entries));
    });

    return () => {
      active = false;
    };
  }, [currentConcepts, getSessionsByConcept]);

  if (isLoading) {
    return (
      <section
        aria-busy="true"
        aria-labelledby="topic-loading-title"
        aria-live="polite"
        className="max-w-3xl py-8 sm:py-12"
      >
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">
          codegym practice
        </p>
        <h1
          id="topic-loading-title"
          className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
        >
          Cargando tema…
        </h1>
      </section>
    );
  }

  if (technology === undefined || technologyId === undefined) {
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
          className="mt-7 inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          Volver a tecnologías
        </Link>
      </section>
    );
  }

  if (currentTopics === null) {
    return <TopicLoading />;
  }

  if (currentTopics.status === 'error') {
    return (
      <section aria-labelledby="topic-error-title" className="max-w-2xl py-8 sm:py-12">
        <h1
          id="topic-error-title"
          className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
        >
          No pudimos cargar este tema
        </h1>
        <p role="alert" className="mt-4 border-l-4 border-destructive pl-4 text-sm text-destructive">
          {currentTopics.message}
        </p>
      </section>
    );
  }

  if (topic === undefined || topicId === undefined) {
    return (
      <section aria-labelledby="topic-unavailable-title" className="max-w-2xl py-8 sm:py-12">
        <h1
          id="topic-unavailable-title"
          className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
        >
          Tema no disponible
        </h1>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          No hemos encontrado este tema dentro de la tecnología seleccionada.
        </p>
        <Link
          to={`/tech/${technologyId}`}
          className="mt-7 inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          Volver a {technology.name}
        </Link>
      </section>
    );
  }

  const concepts = currentConcepts?.status === 'success' ? currentConcepts.concepts : [];
  const practicedConcepts = concepts.filter(
    (concept) => (progress.get(concept.id)?.totalAttempts ?? 0) > 0,
  ).length;

  return (
    <section aria-labelledby="topic-title" className="mx-auto w-full max-w-7xl py-2 sm:py-4">
      <TopicHeader
        technology={technology}
        topic={topic}
        conceptCount={concepts.length}
        practicedConcepts={practicedConcepts}
      />

      <div className="mt-5 grid gap-5 sm:mt-6 xl:grid-cols-[minmax(0,1fr)_minmax(26rem,0.9fr)] xl:items-start xl:gap-6">
        <section
          aria-busy={currentConcepts === null}
          aria-labelledby="concepts-heading"
          className="min-w-0 rounded-2xl border border-border bg-card/80 p-4 shadow-sm sm:p-5"
        >
          <div className="flex items-center gap-3 border-b border-border pb-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary" aria-hidden="true">
              <BookOpen className="size-5" />
            </span>
            <div className="min-w-0">
              <h2 id="concepts-heading" className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                Teoría y conceptos
              </h2>
              <p className="mt-0.5 text-sm text-muted-foreground">Comprende las ideas clave antes de practicar.</p>
            </div>
          </div>

          {currentConcepts === null ? (
            <div role="status" aria-live="polite" className="mt-4 rounded-xl border border-border bg-background/50 p-4 text-sm text-muted-foreground">
              Cargando conceptos…
            </div>
          ) : currentConcepts.status === 'error' ? (
            <p role="alert" className="mt-4 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
              No pudimos cargar los conceptos de este tema. {currentConcepts.message}
            </p>
          ) : concepts.length === 0 ? (
            <EmptyState
              title="Todavía no hay conceptos disponibles"
              description="Este tema está disponible, pero aún no tiene conceptos preparados para practicar."
              className="mt-4 rounded-xl border border-border bg-background/50"
            />
          ) : (
            <ul className="mt-1 divide-y divide-border">
              {concepts.map((concept) => (
                <li key={concept.id} className="min-w-0 py-5 first:pt-4 last:pb-0">
                  <h3 className="min-w-0 break-normal whitespace-normal text-xl font-semibold leading-tight tracking-tight text-foreground">
                    {concept.name}
                  </h3>
                  <LearningContent
                    content={concept.content}
                    fallbackMarkdown={concept.contentMarkdown}
                    conceptName={concept.name}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>

        {currentConcepts?.status === 'success' && concepts.length > 0 ? (
          <aside className="min-w-0 xl:sticky xl:top-20">
            <TopicSessionList concepts={concepts} results={sessionsByConcept} />
          </aside>
        ) : null}
      </div>
    </section>
  );
}

function TopicLoading() {
  return (
    <section
      aria-busy="true"
      aria-labelledby="topic-loading-title"
      aria-live="polite"
      className="max-w-3xl py-8 sm:py-12"
    >
      <p className="font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">
        codegym practice
      </p>
      <h1
        id="topic-loading-title"
        className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
      >
        Cargando tema…
      </h1>
    </section>
  );
}

export default TopicPage;
