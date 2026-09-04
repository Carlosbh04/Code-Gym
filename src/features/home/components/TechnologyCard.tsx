import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Technology } from '@/types/content';

export function TechnologyCard({ technology, topicCount }: { technology: Technology; topicCount: number | undefined }) {
  const short = technology.icon.trim() || technology.name.slice(0, 2).toUpperCase();
  return <Link to={`/tech/${technology.id}`} className="group flex h-full min-h-36 flex-col justify-between rounded-2xl border border-border bg-card p-4 transition-all duration-fast ease-standard hover:-translate-y-0.5 hover:border-primary/50 hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:p-5"><div className="flex items-center gap-3"><span aria-hidden="true" className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-xs font-bold text-primary">{short}</span><h3 className="min-w-0 truncate text-base font-semibold text-foreground sm:text-lg">{technology.name}</h3></div><div className="mt-7 flex items-center justify-between gap-3 text-sm text-muted-foreground"><span>{topicCount === undefined ? 'Cargando temas…' : `${topicCount} ${topicCount === 1 ? 'tema' : 'temas'}`}</span><ArrowRight className="size-5 shrink-0 transition-transform duration-fast group-hover:translate-x-1 group-hover:text-primary" aria-hidden="true" /></div></Link>;
}
