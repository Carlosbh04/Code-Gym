import { cn } from '@/lib/utils';

/**
 * Progreso de pasos dentro de una sesión (§12).
 *
 * Presentacional y no interactivo: el contrato de sesión solo permite avanzar
 * con `NEXT_STEP`, así que no hay salto libre entre pasos y el indicador no
 * ofrece controles.
 *
 * Tres estados, los que define la tarea: completado, activo y pendiente. El
 * estado no depende solo del color — cada paso lleva su etiqueta textual para
 * lectores de pantalla, el activo se distingue también por altura, y el resumen
 * «Paso N de M» queda visible.
 */
export interface StepIndicatorProps {
  totalSteps: number;
  /** Índice del paso actual, empezando en 0. */
  currentStep: number;
  /** Cuántos pasos tienen ya respuesta. */
  completedSteps: number;
  className?: string;
}

type StepState = 'completed' | 'current' | 'pending';

const STATE_LABEL: Record<StepState, string> = {
  completed: 'completado',
  current: 'en curso',
  pending: 'pendiente',
};

const STATE_STYLE: Record<StepState, string> = {
  completed: 'h-1.5 bg-primary',
  current: 'h-2.5 bg-primary',
  pending: 'h-1.5 bg-muted',
};

function stateOf(index: number, currentStep: number, completedSteps: number): StepState {
  if (index === currentStep) return 'current';
  if (index < completedSteps) return 'completed';
  return 'pending';
}

export function StepIndicator({
  totalSteps,
  currentStep,
  completedSteps,
  className,
}: StepIndicatorProps) {
  if (totalSteps <= 0) {
    return null;
  }

  const steps = Array.from({ length: totalSteps }, (_, index) => index);

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <ol aria-label="Progreso de la sesión" className="flex items-end gap-1.5">
        {steps.map((index) => {
          const state = stateOf(index, currentStep, completedSteps);

          return (
            <li
              key={index}
              aria-current={state === 'current' ? 'step' : undefined}
              className="flex min-w-0 flex-1 items-end"
            >
              <span className="sr-only">
                Paso {index + 1}: {STATE_LABEL[state]}
              </span>
              <span
                aria-hidden="true"
                className={cn('w-full rounded-full transition-colors', STATE_STYLE[state])}
              />
            </li>
          );
        })}
      </ol>

      <p
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="text-sm text-muted-foreground"
      >
        Paso {Math.min(currentStep + 1, totalSteps)} de {totalSteps}
      </p>
    </div>
  );
}
