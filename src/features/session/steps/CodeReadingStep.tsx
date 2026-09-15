import { useId } from 'react';
import { CircleCheck, CircleX } from 'lucide-react';
import { CodeBlock } from '@/components/codegym/CodeBlock';
import { cn } from '@/lib/utils';
import type { ExerciseStep } from '@/types/exercise';

/**
 * Paso de lectura de código (§7): el usuario lee un fragmento y elige entre
 * varias respuestas.
 *
 * Componente presentacional y controlado. No valida la respuesta ni ejecuta
 * código: §15 sitúa el engine detrás de los hooks, y la validación es de la
 * sesión (T027/T028). La explicación posterior la muestra ResultFeedback
 * (T030), no este componente.
 *
 * Un paso mal formado lanza en lugar de renderizar algo a medias: §27 trata el
 * contenido inválido como no recuperable, y el ErrorBoundary lo recoge.
 */
export interface CodeReadingStepProps {
  step: ExerciseStep;
  /** Identificador de la opción elegida, o null si aún no se ha respondido. */
  value: string | null;
  onChange: (optionId: string) => void;
  /** Bloquea la elección, por ejemplo una vez validada la respuesta. */
  disabled?: boolean;
  /** Veredicto autoritativo recibido del backend para la respuesta elegida. */
  isCorrect?: boolean;
  className?: string;
}

export function CodeReadingStep({
  step,
  value,
  onChange,
  disabled = false,
  isCorrect,
  className,
}: CodeReadingStepProps) {
  const groupName = useId();

  if (step.type !== 'code-reading') {
    throw new Error(
      `CodeReadingStep recibió un paso de tipo ${step.type}: solo renderiza pasos code-reading`,
    );
  }

  if (step.options === null || step.options.length === 0) {
    throw new Error(`El paso ${step.id} no declara opciones que mostrar`);
  }

  return (
    <fieldset disabled={disabled} className={cn('min-w-0 animate-fade-in-up', className)}>
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

      <ul className="stagger-fade-in-up flex flex-col gap-2">
        {step.options.map((option, index) => {
          const selected = option.id === value;
          const answeredState =
            disabled && selected && isCorrect !== undefined
              ? isCorrect
              : null;

          return (
            <li key={option.id}>
              <label
                className={cn(
                  'flex min-h-11 cursor-pointer items-center gap-3 rounded-md border px-4 py-3 text-sm transition-colors',
                  'focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background',
                  answeredState === true
                    ? 'border-success bg-success/10 text-foreground'
                    : answeredState === false
                      ? 'border-destructive bg-destructive/10 text-foreground'
                    : selected
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
                <span aria-hidden="true" className="flex size-6 shrink-0 items-center justify-center rounded-full border border-current text-xs font-semibold">
                  {String.fromCharCode(65 + index)}
                </span>
                <span className="min-w-0">{option.text}</span>
                {answeredState !== null && (
                  <>
                    {answeredState ? <CircleCheck aria-hidden="true" className="ml-auto size-5 shrink-0 text-success" /> : <CircleX aria-hidden="true" className="ml-auto size-5 shrink-0 text-destructive" />}
                  </>
                )}
              </label>
            </li>
          );
        })}
      </ul>
    </fieldset>
  );
}
