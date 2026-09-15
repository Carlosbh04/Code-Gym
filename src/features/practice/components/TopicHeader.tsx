import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

import type { Technology, Topic } from '@/types/content';

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
  const hasProgress = conceptCount > 0 && practicedConcepts > 0;
  const progressPercent = hasProgress
    ? Math.round((practicedConcepts / conceptCount) * 100)
    : 0;

  return (
    <header className="pb-2">
      <nav
        aria-label="Ruta de navegación"
        className="flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground"
      >
        <Link
          to="/tech"
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

      <div className="mt-3 flex min-w-0 flex-col gap-5 sm:mt-4 lg:flex-row lg:items-end lg:justify-between lg:gap-8">
        <div className="min-w-0">
          <h1
            id="topic-title"
            className="min-w-0 break-normal whitespace-normal text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl"
          >
            {topic.name}
          </h1>
          <p className="mt-2 max-w-3xl break-normal whitespace-normal text-base leading-relaxed text-muted-foreground sm:text-lg">
            {topic.description}
          </p>
        </div>
        {hasProgress ? (
          <section
            aria-label="Progreso del tema"
            className="w-full shrink-0 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 sm:max-w-sm lg:w-72"
          >
            <div className="flex items-baseline justify-between gap-4">
              <p className="text-sm font-semibold text-foreground">Tu progreso</p>
              <p className="shrink-0 text-sm font-medium text-primary">{progressPercent}%</p>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {practicedConcepts} de {conceptCount} {conceptCount === 1 ? 'concepto practicado' : 'conceptos practicados'}
            </p>
            <div
              className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted"
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
      </div>
    </header>
  );
}
