import { cn } from '@/lib/utils';

export interface ProgressProps {
  value: number;
  className?: string;
  indicatorClassName?: string;
  ariaLabel?: string;
}

export function Progress({
  value,
  className,
  indicatorClassName,
  ariaLabel = 'Progreso',
}: ProgressProps) {
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <div
      role="progressbar"
      aria-label={ariaLabel}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={clamped}
      aria-valuetext={`${Math.round(clamped)}%`}
      className={cn('relative h-2 w-full overflow-hidden rounded-full bg-primary/20', className)}
    >
      <div
        className={cn('h-full rounded-full bg-primary transition-all', indicatorClassName)}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
