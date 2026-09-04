import { ArrowRight, Box, Braces, CircleDot, Database, FileCode2, Layers3, TriangleAlert, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import type { Topic } from '@/types/content';

export interface TopicInsight { exerciseCount: number; conceptCount: number; practicedConcepts: number }
const ICONS: Record<string, LucideIcon> = { arrays: Database, functions: Braces, closures: CircleDot, promises: Zap, objects: Box, errors: TriangleAlert, modules: Layers3 };

export function TopicList({ technologyId, topics, insights }: { technologyId: string; topics: Topic[]; insights: ReadonlyMap<string, TopicInsight> }) {
  return <ul className="space-y-3">{topics.map((topic) => <li key={topic.id}><TopicRow technologyId={technologyId} topic={topic} insight={insights.get(topic.id)} /></li>)}</ul>;
}

function TopicRow({ technologyId, topic, insight }: { technologyId: string; topic: Topic; insight: TopicInsight | undefined }) {
  const Icon = ICONS[topic.id] ?? FileCode2;
  const hasProgress = insight !== undefined && insight.conceptCount > 0;
  const progressPercent = hasProgress ? Math.round((insight.practicedConcepts / insight.conceptCount) * 100) : 0;
  return <Link to={`/tech/${technologyId}/${topic.id}`} className="group grid min-h-32 gap-4 rounded-2xl border border-border bg-card p-4 transition-all duration-fast ease-standard hover:-translate-y-0.5 hover:border-primary/60 hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center sm:p-5 lg:grid-cols-[auto_minmax(14rem,1.6fr)_minmax(10rem,0.9fr)_minmax(8rem,0.6fr)_auto]"><span aria-hidden="true" className="flex size-12 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary"><Icon className="size-6" /></span><span className="min-w-0"><span className="block break-words text-lg font-semibold text-foreground">{topic.name}</span><span className="mt-1 block max-w-2xl break-words text-sm leading-relaxed text-muted-foreground">{topic.description}</span></span>{insight !== undefined && <span className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground"><span>{insight.exerciseCount} {insight.exerciseCount === 1 ? 'ejercicio' : 'ejercicios'}</span>{insight.conceptCount > 0 && <span>{insight.conceptCount} {insight.conceptCount === 1 ? 'concepto' : 'conceptos'}</span>}</span>}{hasProgress && <span className="min-w-0 sm:col-start-2 lg:col-start-auto"><span className="block text-sm font-semibold text-foreground">{insight?.practicedConcepts} / {insight?.conceptCount} conceptos</span><span aria-hidden="true" className="mt-2 block h-2 overflow-hidden rounded-full bg-muted"><span className="block h-full rounded-full bg-primary" style={{ width: `${progressPercent}%` }} /></span></span>}<ArrowRight className="size-5 shrink-0 text-muted-foreground transition-all duration-fast group-hover:translate-x-1 group-hover:text-primary sm:justify-self-end" aria-hidden="true" /></Link>;
}
