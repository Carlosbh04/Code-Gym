import type { LucideIcon } from 'lucide-react';

export interface DashboardMetricCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  description?: string;
}

export function DashboardMetricCard({
  icon: Icon,
  label,
  value,
  description,
}: DashboardMetricCardProps) {
  return (
    <article className="min-w-0 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary" aria-hidden="true">
          <Icon className="size-4" />
        </span>
      </div>
      <p className="mt-4 break-words text-2xl font-bold tracking-tight text-foreground">{value}</p>
      {description ? <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p> : null}
    </article>
  );
}
