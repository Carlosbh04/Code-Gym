import type { ReactNode } from 'react';
import { Inbox, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-12 text-center',
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="flex size-16 items-center justify-center rounded-full bg-[var(--bg-tertiary)] text-[var(--text-muted)]"
      >
        <Icon className="size-8" />
      </div>
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-[var(--text-primary)]">{title}</h3>
        {description ? (
          <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
