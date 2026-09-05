import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { TechnologyProgress } from './dashboard-types';

export function TechnologyProgressList({
  items,
  isLoading,
  error,
}: {
  items: TechnologyProgress[];
  isLoading: boolean;
  error: string | null;
}) {
  return (
    <section aria-labelledby="technology-progress-title" className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <div>
        <p className="text-sm font-semibold text-primary">Detalle</p>
        <h2 id="technology-progress-title" className="mt-1 text-xl font-bold text-foreground">Progreso por tecnología</h2>
      </div>
      {isLoading ? <p role="status" className="mt-5 text-sm text-muted-foreground">Cargando tecnologías…</p>
        : error !== null ? <p role="alert" className="mt-5 text-sm text-destructive">No pudimos cargar el progreso por tecnología: {error}</p>
          : items.length === 0 ? <p className="mt-5 text-sm text-muted-foreground">No hay tecnologías con conceptos disponibles.</p>
            : <ul className="mt-5 grid gap-3 sm:grid-cols-2">{items.map((item) => <TechnologyProgressCard key={item.technology.id} item={item} />)}</ul>}
    </section>
  );
}

function TechnologyProgressCard({ item }: { item: TechnologyProgress }) {
  const percentage = item.totalConcepts === 0 ? 0 : Math.round((item.practicedConcepts / item.totalConcepts) * 100);
  const identifier = item.technology.icon.trim() || item.technology.name.slice(0, 2).toUpperCase();
  return (
    <li className="min-w-0 rounded-xl border border-border bg-background/40 p-4">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary" aria-hidden="true">{identifier}</span>
        <div className="min-w-0 flex-1"><h3 className="break-words font-semibold text-foreground">{item.technology.name}</h3><p className="mt-1 text-sm text-muted-foreground">{item.practicedConcepts} de {item.totalConcepts} conceptos</p></div>
        <span className="text-sm font-semibold text-foreground">{percentage}%</span>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label={`Progreso en ${item.technology.name}`} aria-valuemin={0} aria-valuemax={item.totalConcepts} aria-valuenow={item.practicedConcepts} aria-valuetext={`${item.practicedConcepts} de ${item.totalConcepts} conceptos practicados`}><div className="h-full rounded-full bg-primary" style={{ width: `${percentage}%` }} /></div>
      {item.accuracy !== undefined ? <p className="mt-3 text-xs text-muted-foreground">Precisión de respuestas: <span className="font-medium text-foreground">{item.accuracy}%</span></p> : null}
      <Link to={`/tech/${item.technology.id}`} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-primary transition-colors hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"><span>Ver tecnología</span><ArrowRight className="size-4" aria-hidden="true" /></Link>
    </li>
  );
}
