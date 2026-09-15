import {
  ArrowRight,
  Box,
  Braces,
  CheckCircle2,
  Circle,
  CircleDot,
  Clock3,
  Database,
  FileCode2,
  Layers3,
  TriangleAlert,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { Link } from 'react-router-dom';

import type { Topic } from '@/types/content';

export type TopicStatus = 'completed' | 'in-progress' | 'pending';

export interface TopicInsight {
  exerciseCount: number;
  conceptCount: number;
  completedConcepts: number;
  practicedConcepts: number;
  status: TopicStatus;
}

const ICONS: Record<string, LucideIcon> = {
  arrays: Database,
  'js-arrays': Database,
  functions: Braces,
  'js-functions': Braces,
  closures: CircleDot,
  'js-closures': CircleDot,
  promises: Zap,
  'js-promises': Zap,
  objects: Box,
  'js-objects': Box,
  errors: TriangleAlert,
  'js-errors': TriangleAlert,
  modules: Layers3,
  'es6-plus': Layers3,
  'js-es6-plus': Layers3,
};

export function TopicList({
  technologyId,
  topics,
  insights,
}: {
  technologyId: string;
  topics: Topic[];
  insights: ReadonlyMap<string, TopicInsight>;
}) {
  return (
    <ul className="space-y-2.5">
      {topics.map((topic) => {
        const insight = insights.get(topic.id);
        return insight === undefined ? null : (
          <li key={topic.id}>
            <TopicRow technologyId={technologyId} topic={topic} insight={insight} />
          </li>
        );
      })}
    </ul>
  );
}

function TopicRow({
  technologyId,
  topic,
  insight,
}: {
  technologyId: string;
  topic: Topic;
  insight: TopicInsight;
}) {
  const Icon = ICONS[topic.id] ?? FileCode2;
  const progressPercent = insight.conceptCount === 0
    ? 0
    : Math.round((insight.completedConcepts / insight.conceptCount) * 100);
  const progressText = `${insight.completedConcepts} de ${insight.conceptCount} ${insight.conceptCount === 1 ? 'concepto completado' : 'conceptos completados'}`;

  return (
    <Link
      to={`/tech/${technologyId}/${topic.id}`}
      className="group grid min-h-11 grid-cols-[3rem_minmax(0,1fr)] gap-x-3 gap-y-3 rounded-xl border border-border bg-card p-4 transition-colors duration-fast ease-standard hover:border-primary/50 hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:grid-cols-[3rem_minmax(0,1fr)_auto] sm:gap-x-4 xl:grid-cols-[3rem_minmax(15rem,1fr)_9rem_minmax(8rem,10rem)_8rem_1.5rem] xl:items-center xl:gap-x-5"
    >
      <span
        aria-hidden="true"
        className="flex size-12 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary sm:row-span-3 xl:row-auto"
      >
        <Icon className="size-6" />
      </span>

      <span className="min-w-0 sm:col-start-2 xl:col-auto">
        <span className="block whitespace-normal break-normal text-base font-semibold leading-snug text-foreground sm:text-lg">
          {topic.name}
        </span>
        <span className="mt-1 block overflow-hidden whitespace-normal break-normal text-sm leading-5 text-muted-foreground [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
          {topic.description}
        </span>
      </span>

      <span className="col-start-2 flex flex-wrap gap-x-2 gap-y-1 text-sm text-muted-foreground sm:row-start-2 xl:col-auto xl:row-auto xl:flex-col xl:gap-1">
        <span>
          {insight.exerciseCount} {insight.exerciseCount === 1 ? 'ejercicio' : 'ejercicios'}
        </span>
        <span>
          {insight.conceptCount} {insight.conceptCount === 1 ? 'concepto' : 'conceptos'}
        </span>
      </span>

      <span className="col-span-2 min-w-0 sm:col-span-2 sm:col-start-2 sm:row-start-3 xl:col-auto xl:row-auto">
        <span className="flex items-center justify-between gap-3 text-xs font-semibold text-muted-foreground">
          <span>Progreso</span>
          <span className="tabular-nums text-foreground">
            {insight.completedConcepts} / {insight.conceptCount}
          </span>
        </span>
        <span
          className="mt-2 block h-1.5 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-label={`Progreso de ${topic.name}`}
          aria-valuemin={0}
          aria-valuemax={Math.max(insight.conceptCount, 1)}
          aria-valuenow={insight.completedConcepts}
          aria-valuetext={progressText}
        >
          <span
            className={`block h-full rounded-full ${insight.status === 'completed' ? 'bg-success' : 'bg-primary'}`}
            style={{ width: `${progressPercent}%` }}
          />
        </span>
      </span>

      <TopicStatusBadge status={insight.status} />

      <span className="col-span-2 flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border px-3 text-sm font-semibold text-foreground transition-colors group-hover:border-primary/40 group-hover:text-primary sm:col-span-1 sm:col-start-3 sm:row-start-2 sm:min-h-0 sm:border-0 sm:p-0 xl:col-auto xl:row-auto">
        <span className="sm:sr-only">Ver tema</span>
        <ArrowRight
          className="size-5 shrink-0 text-muted-foreground transition-transform duration-fast ease-standard group-hover:translate-x-1 group-hover:text-primary"
          aria-hidden="true"
        />
      </span>
    </Link>
  );
}

function TopicStatusBadge({ status }: { status: TopicStatus }) {
  const config = status === 'completed'
    ? {
        label: 'Completado',
        Icon: CheckCircle2,
        className: 'border-success/30 bg-success/10 text-success',
      }
    : status === 'in-progress'
      ? {
          label: 'En progreso',
          Icon: Clock3,
          className: 'border-primary/30 bg-primary/10 text-primary',
        }
      : {
          label: 'Pendiente',
          Icon: Circle,
          className: 'border-border bg-muted text-muted-foreground',
        };

  return (
    <span
      className={`col-start-2 inline-flex min-h-8 w-fit items-center gap-1.5 rounded-full border px-2.5 text-xs font-semibold sm:col-start-3 sm:row-start-1 sm:justify-self-end xl:col-auto xl:row-auto xl:justify-self-start ${config.className}`}
    >
      <config.Icon className="size-3.5" aria-hidden="true" />
      {config.label}
    </span>
  );
}
