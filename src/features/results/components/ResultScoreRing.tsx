import { cn } from '@/lib/utils';

export interface ResultScoreRingProps {
  correctSteps: number;
  totalSteps: number;
  accuracy: number;
  className?: string;
}

/** Indicador visual del score ya calculado y persistido por la sesión. */
export function ResultScoreRing({ correctSteps, totalSteps, accuracy, className }: ResultScoreRingProps) {
  const safeAccuracy = Math.max(0, Math.min(100, accuracy));

  return (
    <div
      role="img"
      aria-label={`${correctSteps} de ${totalSteps} respuestas correctas, ${safeAccuracy}% de precisión`}
      className={cn('grid size-44 shrink-0 place-items-center rounded-full p-3 sm:size-48', className)}
      style={{ background: `conic-gradient(hsl(var(--success)) ${safeAccuracy}%, hsl(var(--muted)) 0)` }}
    >
      <div className="grid size-full place-items-center rounded-full bg-card text-center">
        <strong className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          {correctSteps}/{totalSteps}
        </strong>
        <span className="text-sm text-muted-foreground">correctas</span>
      </div>
    </div>
  );
}
