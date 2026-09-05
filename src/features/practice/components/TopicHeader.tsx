import {
  Binary,
  Boxes,
  Braces,
  ChevronRight,
  CircleDot,
  FileCode2,
  Layers3,
  Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

import type { Technology, Topic } from '@/types/content';

const TOPIC_ICONS: Record<string, LucideIcon> = {
  arrays: Boxes,
  functions: Braces,
  closures: CircleDot,
  promises: Zap,
  modules: Layers3,
  types: Binary,
};

interface TopicHeaderProps {
  technology: Technology;
  topic: Topic;
  conceptCount: number;
  practicedConcepts: number;
}

export function TopicHeader({
  technology,
  topic,
  conceptCount,
  practicedConcepts,
}: TopicHeaderProps) {
  const Icon = TOPIC_ICONS[topic.id] ?? FileCode2;
  const hasProgress = conceptCount > 0 && practicedConcepts > 0;
  const progressPercent = hasProgress
    ? Math.round((practicedConcepts / conceptCount) * 100)
    : 0;

  return (
    <header className="border-b border-border pb-7 sm:pb-8">
      <nav
        aria-label="Ruta de navegación"
        className="flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground"
      >
        <Link
          to="/#technologies"
          className="inline-flex min-h-11 items-center py-2 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Entrenar
        </Link>
        <ChevronRight className="size-4" aria-hidden="true" />
        <Link
          to={`/tech/${technology.id}`}
          className="inline-flex min-h-11 items-center py-2 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {technology.name}
        </Link>
        <ChevronRight className="size-4" aria-hidden="true" />
        <span aria-current="page" className="py-2 text-foreground">
          {topic.name}
        </span>
      </nav>

      <div className="mt-4 flex items-start justify-between gap-5 sm:mt-5 sm:gap-8">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            Tema de {technology.name}
          </p>
          <h1
            id="topic-title"
            className="mt-3 break-words text-4xl font-bold tracking-tight text-foreground sm:text-5xl"
          >
            {topic.name}
          </h1>
          <p className="mt-3 max-w-3xl break-words text-base leading-relaxed text-muted-foreground sm:text-lg">
            {topic.description}
          </p>
        </div>
        <span
          aria-hidden="true"
          className="flex size-14 shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-primary sm:size-20"
        >
          <Icon className="size-7 sm:size-9" />
        </span>
      </div>

      {hasProgress ? (
        <section
          aria-label="Progreso del tema"
          className="mt-6 max-w-md rounded-xl border border-primary/20 bg-primary/5 px-4 py-3"
        >
          <div className="flex items-baseline justify-between gap-4">
            <p className="text-sm font-semibold text-foreground">Tu progreso</p>
            <p className="shrink-0 text-sm font-medium text-primary">{progressPercent}%</p>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {practicedConcepts} de {conceptCount} {conceptCount === 1 ? 'concepto practicado' : 'conceptos practicados'}
          </p>
          <div
            className="mt-3 h-2 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-label={`Progreso en ${topic.name}`}
            aria-valuemin={0}
            aria-valuemax={conceptCount}
            aria-valuenow={practicedConcepts}
            aria-valuetext={`${practicedConcepts} de ${conceptCount} conceptos practicados`}
          >
            <div className="h-full rounded-full bg-primary" style={{ width: `${progressPercent}%` }} />
          </div>
        </section>
      ) : null}
    </header>
  );
}
