import { ArrowRight, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';
import { TechnologyIcon } from '@/components/codegym/TechnologyIcon';
import type { TrainingTechnologyItem } from '../training-page-model';

const DEFAULT_TECHNOLOGY_DESCRIPTION = 'Practica los conceptos disponibles y consolida tus conocimientos.';

export function TrainingTechnologyCard({ item }: { item: TrainingTechnologyItem }) {
  const { technology, topics, concepts, practicedConcepts, percentage } = item;
  const hasProgress = practicedConcepts > 0;
  const topicLabel = `${topics.length} ${topics.length === 1 ? 'tema' : 'temas'}`;

  return (
    <Link to={`/tech/${technology.id}`} aria-label={`${technology.name} — ${topicLabel}, ${percentage}% de progreso, ${hasProgress ? 'Continuar' : 'Entrenar'}`} className="group flex h-full min-h-64 min-w-0 flex-col rounded-xl border border-border bg-background/45 p-4 shadow-sm transition-all duration-fast hover:-translate-y-0.5 hover:border-primary/45 hover:bg-accent/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:p-5">
      <div className="flex min-w-0 items-start gap-3">
        <TechnologyIcon technologyId={technology.id} technologyName={technology.name} fallback={technology.icon} className="size-12 rounded-xl border-primary/25" />
        <div className="min-w-0"><h3 className="break-words text-lg font-bold tracking-tight text-foreground">{technology.name}</h3><p className="mt-1 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{technology.description.trim() || DEFAULT_TECHNOLOGY_DESCRIPTION}</p></div>
      </div>
      <div className="mt-auto pt-5">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5"><BookOpen className="size-3.5" aria-hidden="true" />{topicLabel}</span>
          <span>{practicedConcepts} de {concepts.length} conceptos</span>
        </div>
        <div className="mt-3 flex items-center justify-between gap-3 text-xs"><span className="font-medium text-muted-foreground">Progreso</span><span className="font-bold text-foreground">{percentage}%</span></div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label={`Progreso en ${technology.name}`} aria-valuemin={0} aria-valuemax={concepts.length} aria-valuenow={practicedConcepts} aria-valuetext={`${practicedConcepts} de ${concepts.length} conceptos practicados`}><div className="h-full rounded-full bg-primary transition-[width] duration-standard ease-standard" style={{ width: `${percentage}%` }} /></div>
        <span className={`mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${hasProgress ? 'bg-primary text-primary-foreground group-hover:bg-primary/90' : 'border border-border bg-card text-foreground group-hover:border-primary/40 group-hover:text-primary'}`}>{hasProgress ? 'Continuar' : 'Entrenar'} <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" /></span>
      </div>
    </Link>
  );
}
