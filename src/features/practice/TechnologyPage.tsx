import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { EmptyState } from '@/components/codegym/EmptyState';
import { useContent } from '@/hooks/useContent';
import { useProgress } from '@/hooks/useProgress';
import type { Concept, Topic } from '@/types/content';
import { TechnologyHeader } from './components/TechnologyHeader';
import { TechnologyTabs } from './components/TechnologyTabs';
import { TopicList, type TopicInsight } from './components/TopicList';

type TopicsResult =
  | { technologyId: string; status: 'success'; topics: Topic[] }
  | { technologyId: string; status: 'error'; message: string };

function TechnologyPage() {
  const { technologyId } = useParams<{ technologyId: string }>();
  const { getTechnology, getTopics, getConceptsByTopic, getSessionsByConcept, isLoading } = useContent();
  const { progress } = useProgress();
  const technology = technologyId ? getTechnology(technologyId) : undefined;
  const [topicsResult, setTopicsResult] = useState<TopicsResult | null>(null);
  const [insights, setInsights] = useState<Map<string, TopicInsight>>(() => new Map());

  useEffect(() => {
    if (isLoading || technology === undefined || technologyId === undefined) return;
    let active = true;
    void getTopics(technologyId).then((topics) => {
      if (active) setTopicsResult({ technologyId, status: 'success', topics });
    }).catch((error: unknown) => {
      if (active) setTopicsResult({ technologyId, status: 'error', message: error instanceof Error ? error.message : 'No se pudieron cargar los temas.' });
    });
    return () => { active = false; };
  }, [getTopics, isLoading, technology, technologyId]);

  const currentTopics = topicsResult?.technologyId === technologyId ? topicsResult : null;

  useEffect(() => {
    if (currentTopics?.status !== 'success') return;
    let active = true;
    void Promise.all(currentTopics.topics.map(async (topic) => {
      const concepts = await getConceptsByTopic(topic.id);
      const sessions = await Promise.all(concepts.map((concept) => getSessionsByConcept(concept.id)));
      return [topic.id, createInsight(concepts, sessions, progress)] as const;
    })).then((entries) => { if (active) setInsights(new Map(entries)); }).catch(() => { if (active) setInsights(new Map()); });
    return () => { active = false; };
  }, [currentTopics, getConceptsByTopic, getSessionsByConcept, progress]);

  if (isLoading) return <TechnologyLoading />;
  if (technology === undefined || technologyId === undefined) return <TechnologyUnavailable />;

  return (
    <section aria-labelledby="technology-title" className="mx-auto w-full max-w-7xl py-2 sm:py-4">
      <TechnologyHeader technology={technology} />
      <TechnologyTabs />
      <section aria-labelledby="topics-heading" className="mt-4">
        <h2 id="topics-heading" className="sr-only">Temas de {technology.name}</h2>
        {currentTopics === null ? <div role="status" aria-live="polite" className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">Cargando temas…</div>
          : currentTopics.status === 'error' ? <p role="alert" className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">No pudimos cargar los temas de esta tecnología. {currentTopics.message}</p>
          : currentTopics.topics.length === 0 ? <EmptyState title="Todavía no hay temas disponibles" description="Esta tecnología está disponible, pero aún no tiene temas preparados para practicar." className="rounded-2xl border border-border bg-card" />
          : <TopicList technologyId={technologyId} topics={currentTopics.topics} insights={insights} />}
      </section>
    </section>
  );
}

function createInsight(concepts: Concept[], sessionsByConcept: Awaited<ReturnType<ReturnType<typeof useContent>['getSessionsByConcept']>>[], progress: ReturnType<typeof useProgress>['progress']): TopicInsight {
  const exerciseCount = sessionsByConcept.flat().reduce((total, session) => total + session.steps.length, 0);
  const practicedConcepts = concepts.filter((concept) => (progress.get(concept.id)?.totalAttempts ?? 0) > 0).length;
  return { exerciseCount, conceptCount: concepts.length, practicedConcepts };
}

function TechnologyLoading() {
  return <section aria-busy="true" aria-labelledby="technology-loading-title" aria-live="polite" className="mx-auto max-w-7xl py-8 sm:py-12"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Entrenar</p><h1 id="technology-loading-title" className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Cargando tecnología…</h1></section>;
}

function TechnologyUnavailable() {
  return <section aria-labelledby="technology-unavailable-title" className="max-w-2xl py-8 sm:py-12"><h1 id="technology-unavailable-title" className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Tecnología no disponible</h1><p className="mt-4 text-base leading-relaxed text-muted-foreground">No hemos encontrado la tecnología solicitada.</p><Link to="/#technologies" className="mt-7 inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">Volver a tecnologías</Link></section>;
}

export default TechnologyPage;
