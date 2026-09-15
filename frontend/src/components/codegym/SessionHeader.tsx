import { DifficultyBadge } from '@/components/codegym/DifficultyBadge';
import { StepIndicator } from '@/components/codegym/StepIndicator';
import { cn } from '@/lib/utils';
import type { Difficulty } from '@/types/exercise';

/**
 * Cabecera presentacional de una sesión (§11, §12, T051).
 *
 * Compone las piezas canónicas de dificultad y progreso; no carga contenido,
 * no guarda estado y no conoce repositorios. `SessionPage` aporta directamente
 * los datos de la sesión y del reducer.
 */
export interface SessionHeaderProps {
  title: string;
  concept: string;
  technology?: string;
  difficulty: Difficulty;
  totalSteps: number;
  currentStep: number;
  completedSteps: number;
  className?: string;
}

export function SessionHeader({
  title,
  concept,
  technology,
  difficulty,
  totalSteps,
  currentStep,
  completedSteps,
  className,
}: SessionHeaderProps) {
  return (
    <header className={cn('min-w-0 rounded-2xl border border-border bg-card/70 p-4 shadow-sm sm:p-6', className)}>
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="break-words text-sm font-medium text-muted-foreground">
            {technology !== undefined && <span>{technology} / </span>}
            <span className="break-words">Concepto: {concept}</span>
          </p>
          <h1 className="mt-1 break-words text-xl font-bold text-foreground sm:text-2xl">
            {title}
          </h1>
        </div>

        <DifficultyBadge
          difficulty={difficulty}
          className="shrink-0 self-start"
        />
      </div>

      <StepIndicator
        totalSteps={totalSteps}
        currentStep={currentStep}
        completedSteps={completedSteps}
        className="mt-4"
      />
    </header>
  );
}
