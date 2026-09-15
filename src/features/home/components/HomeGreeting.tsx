import { Hand, Quote } from 'lucide-react';

export function HomeGreeting() {
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1
          id="home-title"
          className="flex items-center gap-2.5 text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl"
        >
          Hola, Carlos
          <Hand className="size-8 shrink-0 text-primary sm:size-9" aria-hidden="true" />
        </h1>
        <p className="mt-1.5 text-base text-muted-foreground sm:text-lg">
          Sigue practicando. La constancia te lleva lejos.
        </p>
      </div>
      <p className="hidden min-w-0 flex-1 items-start justify-end gap-2 text-right text-sm leading-relaxed text-muted-foreground lg:flex xl:whitespace-nowrap">
        <Quote className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
        <span className="min-w-0">Cada ejercicio suma una nueva pieza a lo que sabes.</span>
      </p>
    </header>
  );
}
