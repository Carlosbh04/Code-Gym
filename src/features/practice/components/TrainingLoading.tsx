export function TrainingLoading() {
  return (
    <div role="status" aria-live="polite" className="space-y-4">
      <p className="sr-only">Cargando catálogo de tecnologías…</p>
      {Array.from({ length: 2 }, (_, section) => (
        <div key={section} aria-hidden="true" className="rounded-2xl border border-border bg-card p-4 sm:p-5">
          <div className="h-6 w-56 max-w-full rounded bg-muted" />
          <div className="mt-2 h-3 w-80 max-w-full rounded bg-muted" />
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 3 }, (__, card) => <div key={card} className="min-h-64 rounded-xl border border-border bg-background/40 p-4"><div className="size-12 rounded-xl bg-muted" /><div className="mt-5 h-3 rounded bg-muted" /><div className="mt-3 h-2 rounded bg-muted" /><div className="mt-20 h-11 rounded-lg bg-muted" /></div>)}</div>
        </div>
      ))}
    </div>
  );
}
