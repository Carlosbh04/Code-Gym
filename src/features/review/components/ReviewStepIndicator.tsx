import { CircleCheck, CircleX } from 'lucide-react';
import type { ExerciseStep } from '@/types/exercise';
import type { Attempt } from '@/types/progress';
import { cn } from '@/lib/utils';

export interface ReviewStepIndicatorProps {
  steps: ExerciseStep[];
  attemptsByStepId: Map<string, Attempt[]>;
  currentIndex: number;
  onSelect: (index: number) => void;
}

export function ReviewStepIndicator({ steps, attemptsByStepId, currentIndex, onSelect }: ReviewStepIndicatorProps) {
  return <nav aria-label="Preguntas de la sesión" className="overflow-x-auto pb-1"><ol className="flex min-w-max gap-2">{steps.map((step, index) => {
    const attempts = attemptsByStepId.get(step.id) ?? [];
    const attempt = attempts[attempts.length - 1];
    const Icon = attempt?.isCorrect ? CircleCheck : CircleX;
    return <li key={step.id}><button type="button" onClick={() => onSelect(index)} aria-current={currentIndex === index ? 'step' : undefined} aria-label={`Ir a la pregunta ${index + 1}${attempt === undefined ? ', sin respuesta' : attempt.isCorrect ? ', correcta' : ', incorrecta'}`} className={cn('inline-flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-lg border px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', currentIndex === index ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-foreground hover:bg-accent')}><span>{index + 1}</span>{attempt !== undefined && <Icon aria-hidden="true" className={cn('size-4', currentIndex === index ? 'text-primary-foreground' : attempt.isCorrect ? 'text-success' : 'text-destructive')} />}</button></li>;
  })}</ol></nav>;
}
