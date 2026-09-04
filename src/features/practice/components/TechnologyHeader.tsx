import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Technology } from '@/types/content';

export function TechnologyHeader({ technology }: { technology: Technology }) {
  const identifier = technology.icon.trim().toUpperCase() || technology.name.slice(0, 2).toUpperCase();
  return <header className="flex items-start justify-between gap-6 border-b border-border pb-7 sm:pb-8"><div className="min-w-0"><nav aria-label="Ruta de navegación" className="flex items-center gap-2 text-sm text-muted-foreground"><Link to="/#technologies" className="min-h-11 py-2 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Entrenar</Link><ChevronRight className="size-4" aria-hidden="true" /><span aria-current="page" className="truncate">{technology.name}</span></nav><h1 id="technology-title" className="mt-3 break-words text-4xl font-bold tracking-tight text-foreground sm:text-5xl">{technology.name}</h1><p className="mt-3 max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-lg">{technology.description}</p></div><span aria-hidden="true" className="flex size-16 shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-2xl font-bold text-primary sm:size-20 sm:text-3xl">{identifier}</span></header>;
}
