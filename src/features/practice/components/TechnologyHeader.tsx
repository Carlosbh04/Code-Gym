import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { TechnologyIcon } from '@/components/codegym/TechnologyIcon';
import type { Technology } from '@/types/content';

export function TechnologyHeader({ technology }: { technology: Technology }) {
  return <header className="flex items-start justify-between gap-4 sm:gap-6"><div className="min-w-0"><nav aria-label="Ruta de navegación" className="flex items-center gap-2 text-sm text-muted-foreground"><Link to="/#technologies" className="inline-flex min-h-11 items-center transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Entrenar</Link><ChevronRight className="size-4" aria-hidden="true" /><span aria-current="page" className="truncate">{technology.name}</span></nav><h1 id="technology-title" className="mt-2 whitespace-normal break-normal text-4xl font-bold tracking-tight text-foreground sm:text-5xl">{technology.name}</h1><p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base lg:text-lg">{technology.description}</p></div><TechnologyIcon technologyId={technology.id} technologyName={technology.name} fallback={technology.icon} className="mt-11 size-14 rounded-xl border-primary/30 text-xl shadow-sm sm:size-20 sm:text-3xl" /></header>;
}
