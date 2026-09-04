export function TechnologyLoading() {
  return <div role="status" aria-live="polite"><p className="sr-only">Cargando tecnologías…</p><div aria-hidden="true" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">{Array.from({ length: 6 }, (_, index) => <div key={index} className="min-h-36 rounded-2xl border border-border bg-card p-4"><div className="size-11 rounded-xl bg-muted" /><div className="mt-7 h-3 w-16 rounded bg-muted" /></div>)}</div></div>;
}
