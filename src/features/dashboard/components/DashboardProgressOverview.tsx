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
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
        <div>
          <p className="text-sm font-semibold text-primary">Visión general</p>
          <h2 id="global-progress-title" className="mt-1 text-xl font-bold text-foreground">Progreso de conceptos</h2>
        </div>
        {!isLoading && error === null && totalConcepts > 0 ? <p className="text-sm font-semibold text-foreground">{percentage}%</p> : null}
      </div>
      {isLoading ? <p role="status" className="mt-5 text-sm text-muted-foreground">Cargando el catálogo de aprendizaje…</p>
        : error !== null ? <p role="alert" className="mt-5 text-sm text-destructive">No pudimos calcular el progreso por contenido: {error}</p>
          : totalConcepts === 0 ? <p className="mt-5 text-sm text-muted-foreground">Todavía no hay conceptos disponibles para comparar.</p>
            : <><p className="mt-5 text-3xl font-bold tracking-tight text-foreground">{practicedConcepts} <span className="text-lg font-medium text-muted-foreground">de {totalConcepts} conceptos</span></p><div className="mt-4 h-2.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label="Conceptos practicados" aria-valuemin={0} aria-valuemax={totalConcepts} aria-valuenow={practicedConcepts} aria-valuetext={`${practicedConcepts} de ${totalConcepts} conceptos practicados`}><div className="h-full rounded-full bg-primary transition-[width] duration-standard ease-standard" style={{ width: `${percentage}%` }} /></div><p className="mt-3 text-sm leading-relaxed text-muted-foreground">Cuenta los conceptos con al menos una respuesta registrada; no representa una puntuación ni una calificación.</p></>}
    </section>
  );
}
