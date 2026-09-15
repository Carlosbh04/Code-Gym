export function TechnologyLoading() {
  return <div role="status" aria-live="polite"><p className="sr-only">Cargando tecnologías…</p><div aria-hidden="true" className="grid grid-cols-2 gap-3 xl:grid-cols-3">{Array.from({ length: 6 }, (_, index) => <div key={index} className="min-h-32 rounded-xl border border-border bg-card p-4"><div className="size-10 rounded-lg bg-muted" /><div className="mt-4 h-2 rounded bg-muted" /><div className="mt-3 h-3 w-20 rounded bg-muted" /></div>)}</div></div>;
}
