import type { LucideIcon } from 'lucide-react';
import type { TrainingTechnologyItem } from '../training-page-model';
import { TrainingTechnologyCard } from './TrainingTechnologyCard';

export function TechnologySection({ id, icon: Icon, title, description, items }: { id: string; icon: LucideIcon; title: string; description: string; items: TrainingTechnologyItem[] }) {
  if (items.length === 0) return null;
  return (
    <section aria-labelledby={id} className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
      <div className="flex items-start gap-3 border-b border-border pb-4">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon className="size-5" aria-hidden="true" /></span>
        <div><h2 id={id} className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">{title}</h2><p className="mt-1 text-sm leading-relaxed text-muted-foreground">{description}</p></div>
      </div>
      <ul className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{items.map((item) => <li key={item.technology.id} className="min-w-0"><TrainingTechnologyCard item={item} /></li>)}</ul>
    </section>
  );
}
