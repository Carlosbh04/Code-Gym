import { ArrowRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { EmptyState } from '@/components/codegym/EmptyState';
import { useContent } from '@/hooks/useContent';
import type { Concept, Topic } from '@/types/content';
import type { ExerciseSession } from '@/types/exercise';
import { LearningContent } from './components/LearningContent';

type TopicsResult =
  | { technologyId: string; status: 'success'; topics: Topic[] }
  | { technologyId: string; status: 'error'; message: string };

type ConceptsResult =
  | { topicId: string; status: 'success'; concepts: Concept[] }
  | { topicId: string; status: 'error'; message: string };

type SessionsResult =
  | { status: 'success'; sessions: ExerciseSession[] }
  | { status: 'error'; message: string };

function TopicPage() {
  const { technologyId, topicId } = useParams<{
    technologyId: string;
    topicId: string;
  }>();
  const { getTechnology, getTopics, getConceptsByTopic, getSessionsByConcept, isLoading } =
    useContent();
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

  return (
    <section aria-labelledby="topic-title" className="mx-auto max-w-5xl py-2 sm:py-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
        {technology.name} · codegym practice
      </p>
      <h1
        id="topic-title"
        className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
      >
        {topic.name}
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
        {topic.description}
      </p>

      <section
        aria-busy={currentConcepts === null}
        aria-labelledby="concepts-heading"
        className="mt-10 border-t border-border pt-8 sm:mt-12"
      >
        <h2 id="concepts-heading" className="text-2xl font-bold text-foreground">
          Conceptos
        </h2>

        {currentConcepts === null ? (
          <div role="status" aria-live="polite" className="mt-5 text-sm text-muted-foreground">
            Cargando conceptos…
          </div>
        ) : currentConcepts.status === 'error' ? (
          <p role="alert" className="mt-5 border-l-4 border-destructive pl-4 text-sm text-destructive">
            No pudimos cargar los conceptos de este tema. {currentConcepts.message}
          </p>
        ) : currentConcepts.concepts.length === 0 ? (
          <EmptyState
            title="Todavía no hay conceptos disponibles"
            description="Este tema está disponible, pero aún no tiene conceptos preparados para practicar."
            className="mt-3 rounded-lg border border-border bg-card"
          />
        ) : (
          <ul className="mt-5 space-y-5">
            {currentConcepts.concepts.map((concept) => (
              <li
                key={concept.id}
                className="rounded-2xl border border-border bg-card p-5 sm:p-6"
              >
                <h3 className="break-words text-lg font-semibold text-foreground">
                  {concept.name}
                </h3>
                <LearningContent
                  content={concept.content}
                  fallbackMarkdown={concept.contentMarkdown}
                  conceptName={concept.name}
                />
                <ConceptSessions result={sessionsByConcept[concept.id]} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}

function ConceptSessions({ result }: { result: SessionsResult | undefined }) {
  return (
    <section aria-label="Sesiones disponibles" className="mt-6 border-t border-border pt-5">
      <h4 className="text-sm font-semibold text-foreground">Sesiones disponibles</h4>
      {result === undefined ? (
        <p role="status" className="mt-2 text-sm text-muted-foreground">Cargando sesiones…</p>
      ) : result.status === 'error' ? (
        <p role="alert" className="mt-2 text-sm text-destructive">
          No pudimos cargar las sesiones. {result.message}
        </p>
      ) : result.sessions.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">No hay sesiones disponibles todavía.</p>
      ) : (
        <ul className="mt-3 grid gap-3 md:grid-cols-2">
          {result.sessions.map((session) => (
            <li key={session.id}>
              <Link
                to={`/practice/${session.id}`}
                className="group flex min-h-28 flex-col gap-2 rounded-xl border border-border bg-background p-4 ring-offset-background transition-all duration-fast hover:-translate-y-0.5 hover:border-primary/60 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <span className="font-medium text-foreground">{session.title}</span>
                <span className="text-sm text-muted-foreground">
                  {session.difficulty} · {session.steps.length} ejercicios
                </span>
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-primary">Empezar práctica <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" /></span>
              </Link>
            </li>
          ))}
        </ul>
      )}
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
