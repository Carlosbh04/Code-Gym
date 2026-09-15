import { ArrowRight, BarChart3 } from 'lucide-react';
import { Link } from 'react-router-dom';

export function TrainingHeader() {
  return (
    <header className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 id="training-title" className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">Entrenar</h1>
        <p className="mt-2 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">Explora las tecnologías disponibles y elige por dónde continuar.</p>
      </div>
      <Link to="/dashboard" className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 self-start rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:border-primary/40 hover:bg-accent hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:mb-0.5 sm:self-auto">
        <BarChart3 className="size-4 text-primary" aria-hidden="true" />
        Ver mi progreso <ArrowRight className="size-4" aria-hidden="true" />
      </Link>
    </header>
  );
}
