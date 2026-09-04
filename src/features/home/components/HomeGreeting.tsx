import { Hand } from 'lucide-react';

export function HomeGreeting() {
  return <section aria-labelledby="home-title"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Entrenamiento diario</p><h1 id="home-title" className="mt-2 flex items-center gap-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">Hola, Carlos<Hand className="size-8 shrink-0 text-primary sm:size-9" aria-hidden="true" /></h1><p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">Sigue practicando. La constancia te lleva lejos.</p></section>;
}
