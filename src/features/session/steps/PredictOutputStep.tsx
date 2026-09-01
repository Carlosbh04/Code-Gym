import { useId } from 'react';
import { CodeBlock } from '@/components/codegym/CodeBlock';
import { cn } from '@/lib/utils';
import type { ExerciseStep } from '@/types/exercise';

/**
 * Paso de predicción de salida (§7): el usuario lee un fragmento y elige qué
 * imprime o devuelve.
 *
 * §24 valida este tipo igual que `code-reading` —«optionId contra correct
 * flag»— así que la interacción es la misma elección única. Lo que cambia es
 * qué son las opciones: aquí no son frases, son valores de salida del
 * programa (`undefined`, `['a', 'b']`), y por eso se componen en monoespaciada
 * y conservan sus espacios.
 *
 * Componente presentacional y controlado. No valida la respuesta ni ejecuta
 * código: §15 sitúa el engine detrás de los hooks, y la validación es de la
 * sesión (T027/T028). La explicación posterior la muestra ResultFeedback
 * (T030), no este componente.
 *
 * Un paso mal formado lanza en lugar de renderizar algo a medias: §27 trata el
 * contenido inválido como no recuperable, y el ErrorBoundary lo recoge.
 */
export interface PredictOutputStepProps {
  step: ExerciseStep;
  /** Identificador de la opción elegida, o null si aún no se ha respondido. */
  value: string | null;
  onChange: (optionId: string) => void;
  /** Bloquea la elección, por ejemplo una vez validada la respuesta. */
  disabled?: boolean;
  className?: string;
}

export function PredictOutputStep({
  step,
  value,
  onChange,
  disabled = false,
  className,
}: PredictOutputStepProps) {
  const groupName = useId();

  if (step.type !== 'predict-output') {
    throw new Error(
      `PredictOutputStep recibió un paso de tipo ${step.type}: solo renderiza pasos predict-output`,
    );
  }

  if (step.options === null || step.options.length === 0) {
    throw new Error(`El paso ${step.id} no declara opciones que mostrar`);
  }

  return (
    <fieldset disabled={disabled} className={cn('min-w-0', className)}>
      <legend className="mb-4 text-base font-medium text-foreground">
        {step.prompt}
      </legend>

      {step.code !== null && (
        <CodeBlock
          code={step.code}
          language={step.language ?? undefined}
          className="mb-5"
        />
      )}

      <ul className="flex flex-col gap-2">
        {step.options.map((option) => {
          const selected = option.id === value;

          return (
            <li key={option.id}>
              <label
                className={cn(
                  'flex min-h-11 cursor-pointer items-center gap-3 rounded-md border px-4 py-3 transition-colors',
                  'focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background',
                  selected
                    ? 'border-primary bg-primary/10 text-foreground'
                    : 'border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground',
                  disabled && 'cursor-not-allowed opacity-60 hover:bg-card',
                )}
              >
                <input
                  type="radio"
                  name={groupName}
                  value={option.id}
                  checked={selected}
                  onChange={() => onChange(option.id)}
                  disabled={disabled}
                  className="size-4 shrink-0 accent-primary"
                />
                <span className="min-w-0 whitespace-pre-wrap break-words font-mono text-sm">
                  {option.text}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </fieldset>
  );
}
