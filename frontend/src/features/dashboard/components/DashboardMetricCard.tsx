import type { LucideIcon } from 'lucide-react';

export interface DashboardMetricCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  description?: string;
  tone?: 'primary' | 'success' | 'warning';
}

const TONE_CLASS = {
  primary: 'bg-primary/10 text-primary',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
} as const;

export function DashboardMetricCard({
  icon: Icon,
  label,
  value,
  description,
  tone = 'primary',
}: DashboardMetricCardProps) {
  return (
    <article className="min-w-0 rounded-xl border border-border bg-card p-4 shadow-sm transition-colors hover:border-primary/20">
      <div className="flex items-center gap-3">
        <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${TONE_CLASS[tone]}`} aria-hidden="true">
          <Icon className="size-4" />
        </span>
        <p className="min-w-0 text-sm font-medium leading-tight text-muted-foreground">{label}</p>
      </div>
      <p className="mt-4 break-words text-2xl font-bold tracking-tight text-foreground">{value}</p>
      {description ? <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p> : null}
    </article>
  );
}
