import { useEffect, useState } from 'react';
import { BookOpen } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { EmptyState } from '@/components/codegym/EmptyState';
import { Skeleton } from '@/components/codegym/Skeleton';
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
    return <TopicLoading />;
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
          to="/tech"
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
            <TopicConceptsLoading />
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

function TopicConceptsLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="mt-1"
    >
      <span className="sr-only">
        Cargando conceptos…
      </span>

      <div
        aria-hidden="true"
        className="divide-y divide-border"
      >
        {Array.from({ length: 3 }, (_, index) => (
          <div
            key={index}
            className="min-w-0 py-5 first:pt-4 last:pb-0"
          >
            <Skeleton className="h-6 w-52 max-w-full" />

            <div className="mt-4 space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-11/12" />
              <Skeleton className="h-4 w-4/5" />
            </div>

            {index === 0 ? (
              <div className="mt-4 rounded-xl border border-border bg-background/50 p-4">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="mt-3 h-20 w-full rounded-lg" />
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function TopicLoading() {
  return (
    <section
      aria-busy="true"
      aria-labelledby="topic-loading-title"
      aria-live="polite"
      className="mx-auto w-full max-w-7xl py-2 sm:py-4"
    >
      <h1
        id="topic-loading-title"
        className="sr-only"
      >
        Cargando tema…
      </h1>

      <div aria-hidden="true">
        <div className="pb-2">
          <div className="flex flex-wrap items-center gap-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="size-4 rounded-md" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="size-4 rounded-md" />
            <Skeleton className="h-4 w-28" />
          </div>

          <div className="mt-3 flex min-w-0 flex-col gap-5 sm:mt-4 lg:flex-row lg:items-end lg:justify-between lg:gap-8">
            <div className="min-w-0 flex-1">
              <Skeleton className="h-10 w-72 max-w-full sm:h-12" />

              <div className="mt-3 space-y-2">
                <Skeleton className="h-4 w-full max-w-3xl" />
                <Skeleton className="h-4 w-4/5 max-w-2xl" />
              </div>
            </div>

            <div className="w-full shrink-0 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 sm:max-w-sm lg:w-72">
              <div className="flex items-center justify-between gap-4">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-10" />
              </div>

              <Skeleton className="mt-2 h-3 w-28" />
              <Skeleton className="mt-3 h-1.5 w-full rounded-full" />
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-5 sm:mt-6 xl:grid-cols-[minmax(0,1fr)_minmax(26rem,0.9fr)] xl:items-start xl:gap-6">
          <section className="min-w-0 rounded-2xl border border-border bg-card/80 p-4 shadow-sm sm:p-5">
            <div className="flex items-center gap-3 border-b border-border pb-4">
              <Skeleton className="size-10 shrink-0 rounded-lg" />

              <div className="min-w-0 flex-1">
                <Skeleton className="h-6 w-44" />
                <Skeleton className="mt-2 h-3 w-64 max-w-full" />
              </div>
            </div>

            <div className="mt-1">
              {Array.from({ length: 3 }, (_, index) => (
                <div
                  key={index}
                  className="border-b border-border py-5 last:border-b-0 last:pb-0"
                >
                  <Skeleton className="h-6 w-52 max-w-full" />

                  <div className="mt-4 space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-11/12" />
                    <Skeleton className="h-4 w-4/5" />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <aside className="min-w-0">
            <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
              <div className="flex items-start gap-3">
                <Skeleton className="size-10 shrink-0 rounded-lg" />

                <div className="min-w-0 flex-1">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="mt-2 h-6 w-48 max-w-full" />
                  <Skeleton className="mt-2 h-3 w-full max-w-72" />
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {Array.from({ length: 3 }, (_, index) => (
                  <div
                    key={index}
                    className="rounded-xl border border-border p-4"
                  >
                    <div className="grid grid-cols-[2.75rem_minmax(0,1fr)] gap-3">
                      <Skeleton className="size-11 rounded-full" />

                      <div className="min-w-0">
                        <Skeleton className="h-4 w-3/4" />

                        <div className="mt-3 flex gap-2">
                          <Skeleton className="h-7 w-24 rounded-full" />
                          <Skeleton className="h-3 w-16 self-center" />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </section>
  );
}

export default TopicPage;
