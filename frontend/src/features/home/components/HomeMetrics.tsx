import type { LucideIcon } from 'lucide-react';

export interface HomeMetric {
  icon: LucideIcon;
  label: string;
  value: string;
  description: string;
}

export function HomeMetrics({ metrics }: { metrics: HomeMetric[] }) {
  return (
    <section aria-labelledby="home-metrics-title">
      <h2 id="home-metrics-title" className="mb-3 text-lg font-bold text-foreground">Tu actividad</h2>
      <div aria-label="Métricas rápidas" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {metrics.map(({ icon: Icon, label, value, description }) => (
          <article key={label} className="min-w-0 rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon className="size-4" aria-hidden="true" /></span>
              <p className="break-words text-right text-xl font-bold tracking-tight text-foreground sm:text-2xl">{value}</p>
            </div>
            <h3 className="mt-3 text-sm font-semibold leading-snug text-foreground">{label}</h3>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
