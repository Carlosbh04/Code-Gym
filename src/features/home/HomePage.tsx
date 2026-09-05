import { useEffect, useState } from 'react';

import { EmptyState } from '@/components/codegym/EmptyState';
import { useContent } from '@/hooks/useContent';
import { useHistory } from '@/hooks/useHistory';
import { useProgress } from '@/hooks/useProgress';
import type { ExerciseSession } from '@/types/exercise';
import { ContinueCard } from './components/ContinueCard';
import { HomeGreeting } from './components/HomeGreeting';
import { MotivationCard } from './components/MotivationCard';
import { StreakCard } from './components/StreakCard';
import { TechnologyGrid } from './components/TechnologyGrid';
import { TechnologyLoading } from './components/TechnologyLoading';

interface NextSession { session: ExerciseSession; conceptName: string }

function HomePage() {
  const { technologies, getTopics, getConceptsByTopic, getSessionsByConcept, isLoading } = useContent();
  const { recentCompletedSessions, completedSessionsLoading } = useHistory();
  const { progress, isLoading: progressLoading } = useProgress();
  const [topicCounts, setTopicCounts] = useState<Map<string, number>>(() => new Map());
  const [nextSession, setNextSession] = useState<NextSession | null>(null);
  const hasTechnologies = technologies.length > 0;

  useEffect(() => {
    if (isLoading || !hasTechnologies) return;
    let active = true;
    void Promise.all(technologies.map(async (technology) => [technology.id, (await getTopics(technology.id)).length] as const))
      .then((entries) => { if (active) setTopicCounts(new Map(entries)); })
      .catch(() => { if (active) setTopicCounts(new Map()); });
    return () => { active = false; };
  }, [getTopics, hasTechnologies, isLoading, technologies]);

  useEffect(() => {
    if (isLoading || !hasTechnologies) return;
    let active = true;
    void getTopics('javascript').then(async (topics) => {
      const topic = topics[0];
      if (topic === undefined) return null;
      const concept = (await getConceptsByTopic(topic.id))[0];
      if (concept === undefined) return null;
      const session = (await getSessionsByConcept(concept.id))[0];
      return session === undefined ? null : { session, conceptName: concept.name };
    }).then((value) => { if (active) setNextSession(value); }).catch(() => { if (active) setNextSession(null); });
    return () => { active = false; };
  }, [getConceptsByTopic, getSessionsByConcept, getTopics, hasTechnologies, isLoading]);

  const practicedConcepts = Array.from(progress.values()).filter((item) => item.totalAttempts > 0).length;
  return <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-8 sm:gap-10 lg:gap-12">
    <HomeGreeting />
    <section aria-label="Resumen de entrenamiento" className="grid gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(280px,0.75fr)]">
      <ContinueCard session={nextSession?.session ?? null} conceptName={nextSession?.conceptName ?? null} isLoading={isLoading} practicedConcepts={practicedConcepts} />
      <StreakCard completedSessions={recentCompletedSessions.length} isLoading={completedSessionsLoading} />
    </section>
    <section id="technologies" aria-labelledby="technologies-title" className="scroll-mt-24">
      <div className="mb-5 flex items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Practica a tu ritmo</p><h2 id="technologies-title" className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Tecnologías</h2></div>{!progressLoading && <p className="text-sm text-muted-foreground">{practicedConcepts} conceptos practicados</p>}</div>
      {isLoading ? <TechnologyLoading /> : technologies.length === 0 ? <EmptyState title="No hay tecnologías disponibles" description="Todavía no hay tecnologías preparadas para practicar." className="rounded-2xl border border-border bg-card" /> : <TechnologyGrid technologies={technologies} topicCounts={topicCounts} />}
    </section>
    <MotivationCard />
  </div>;
}

export default HomePage;
