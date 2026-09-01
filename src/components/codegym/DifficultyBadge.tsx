import type { Difficulty } from '@/types/content';
import { cn } from '@/lib/utils';

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  beginner: 'Principiante',
  intermediate: 'Intermedio',
  advanced: 'Avanzado',
};

const DIFFICULTY_STYLES: Record<Difficulty, string> = {
  beginner: 'border-success text-success',
  intermediate: 'border-warning text-warning',
  advanced: 'border-destructive text-destructive',
};

export interface DifficultyBadgeProps {
  difficulty: Difficulty;
  className?: string;
}

export function DifficultyBadge({
  difficulty,
  className,
}: DifficultyBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        DIFFICULTY_STYLES[difficulty],
        className,
      )}
    >
      {DIFFICULTY_LABELS[difficulty]}
    </span>
  );
}
