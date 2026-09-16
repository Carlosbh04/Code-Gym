import { TrendingUp } from 'lucide-react';

import { Skeleton } from '@/components/codegym/Skeleton';

export function DashboardProgressOverview({
  practicedConcepts,
  totalConcepts,
  isLoading,
  error,
}: {
  practicedConcepts: number;
  totalConcepts: number;
  isLoading: boolean;
  error: string | null;
}) {
  const percentage = totalConcepts === 0 ? 0 : Math.round((practicedConcepts / totalConcepts) * 100);

  return (
    <section aria-labelledby="global-progress-title" className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><TrendingUp className="size-5" /></span>
          <h2 id="global-progress-title" className="text-xl font-bold text-foreground">Progreso general</h2>
        </div>
        {!isLoading && error === null && totalConcepts > 0 ? <p className="text-3xl font-bold tabular-nums tracking-tight text-foreground sm:text-4xl">{percentage}%</p> : null}
      </div>
      {isLoading ? (
        <div
          aria-hidden="true"
          className="mt-6"
        >
          <Skeleton className="h-6 w-44" />
          <Skeleton className="mt-4 h-2.5 w-full rounded-full" />
          <Skeleton className="mt-3 h-4 w-3/4" />
        </div>
      )
        : error !== null ? <p role="alert" className="mt-5 text-sm text-destructive">No pudimos calcular el progreso por contenido: {error}</p>
          : totalConcepts === 0 ? <p className="mt-5 text-sm text-muted-foreground">Todavía no hay conceptos disponibles para comparar.</p>
            : <><p className="mt-6 text-lg font-semibold text-foreground">{practicedConcepts} de {totalConcepts} conceptos practicados</p><div className="mt-4 h-2.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label="Conceptos practicados" aria-valuemin={0} aria-valuemax={totalConcepts} aria-valuenow={practicedConcepts} aria-valuetext={`${practicedConcepts} de ${totalConcepts} conceptos practicados`}><div className="h-full rounded-full bg-primary transition-[width] duration-standard ease-standard" style={{ width: `${percentage}%` }} /></div><p className="mt-3 text-sm leading-relaxed text-muted-foreground">Sigue practicando para avanzar por más conceptos y tecnologías.</p></>}
    </section>
  );
}
