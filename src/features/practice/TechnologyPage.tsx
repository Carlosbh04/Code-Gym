import { ArrowRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { EmptyState } from '@/components/codegym/EmptyState';
import { useContent } from '@/hooks/useContent';
import type { Topic } from '@/types/content';

type TopicsResult =
  | { technologyId: string; status: 'success'; topics: Topic[] }
  | { technologyId: string; status: 'error'; message: string };

const TOPIC_LINK_CLASSES =
  'group flex min-h-32 flex-col justify-between rounded-2xl border border-border bg-card p-5 ring-offset-background transition-all duration-fast hover:-translate-y-0.5 hover:border-primary/60 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:p-6';

function TechnologyPage() {
  const { technologyId } = useParams<{ technologyId: string }>();
  const { getTechnology, getTopics, isLoading } = useContent();
  const technology = technologyId ? getTechnology(technologyId) : undefined;
  const [topicsResult, setTopicsResult] = useState<TopicsResult | null>(null);

  useEffect(() => {
    if (isLoading || technology === undefined || technologyId === undefined) {
      return;
    }

    let active = true;
    void getTopics(technologyId)
      .then((topics) => {
        if (active) {
          setTopicsResult({ technologyId, status: 'success', topics });
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setTopicsResult({
            technologyId,
            status: 'error',
            message:
              error instanceof Error
                ? error.message
                : 'No se pudieron cargar los temas.',
          });
        }
      });

    return () => {
      active = false;
    };
  }, [getTopics, isLoading, technology, technologyId]);

  if (isLoading) {
    return (
      <section
        aria-busy="true"
        aria-labelledby="technology-loading-title"
        aria-live="polite"
        className="max-w-3xl py-8 sm:py-12"
      >
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">
          codegym practice
        </p>
        <h1
          id="technology-loading-title"
          className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
        >
          Cargando tecnología…
        </h1>
        <p className="mt-4 text-sm text-muted-foreground">
          Preparando los temas disponibles.
        </p>
      </section>
    );
  }

  if (technology === undefined || technologyId === undefined) {
    return (
      <section
        aria-labelledby="technology-unavailable-title"
        className="max-w-2xl py-8 sm:py-12"
      >
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

  const currentTopics =
    topicsResult?.technologyId === technologyId ? topicsResult : null;

  return (
    <section aria-labelledby="technology-title" className="mx-auto max-w-5xl py-2 sm:py-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
        codegym practice
      </p>
      <h1
        id="technology-title"
        className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
      >
        {technology.name}
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
        {technology.description}
      </p>

      <section aria-labelledby="topics-heading" className="mt-10 border-t border-border pt-8 sm:mt-12">
        <h2 id="topics-heading" className="text-2xl font-bold text-foreground">
          Temas
        </h2>

        {currentTopics === null ? (
          <div role="status" aria-live="polite" className="mt-5 text-sm text-muted-foreground">
            Cargando temas…
          </div>
        ) : currentTopics.status === 'error' ? (
          <p role="alert" className="mt-5 border-l-4 border-destructive pl-4 text-sm text-destructive">
            No pudimos cargar los temas de esta tecnología. {currentTopics.message}
          </p>
        ) : currentTopics.topics.length === 0 ? (
          <EmptyState
            title="Todavía no hay temas disponibles"
            description="Esta tecnología está disponible, pero aún no tiene temas preparados para practicar."
            className="mt-3 rounded-lg border border-border bg-card"
          />
        ) : (
          <ul className="mt-5 grid gap-3 md:grid-cols-2">
            {currentTopics.topics.map((topic) => (
              <li key={topic.id}>
                <Link
                  to={`/tech/${technologyId}/${topic.id}`}
                  className={TOPIC_LINK_CLASSES}
                >
                  <span className="min-w-0">
                    <span className="block break-words text-lg font-semibold text-foreground">
                      {topic.name}
                    </span>
                    <span className="mt-2 block break-words text-sm leading-relaxed text-muted-foreground">
                      {topic.description}
                    </span>
                  </span>
                  <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary">Ver tema <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" /></span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}

export default TechnologyPage;
