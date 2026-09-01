import { useId } from 'react';
import { cn } from '@/lib/utils';
import type { FindErrorSelection } from '@/features/session/session-types';
import type { ExerciseStep } from '@/types/exercise';

/**
 * Paso de localización de errores (§7): el usuario señala la línea que falla y
 * clasifica el tipo de error.
 *
 * La respuesta es compuesta (D014): §24 la valida como «línea + tipo contra
 * errorLines + errorType», y solo acierta quien acierta las dos. Este
 * componente recoge las dos mitades por separado y las emite juntas; quien
 * decide si la respuesta está completa y quien la valida es la capa de sesión,
 * no la interfaz.
 *
 * Sobre el código: se muestra como una lista de líneas seleccionables, una por
 * cada línea real de `step.code`, numeradas desde 1 igual que `errorLines`. No
 * lleva resaltado de sintaxis a propósito: colorear cada línea por separado
 * mal interpreta las construcciones que ocupan varias —una plantilla, un
 * comentario de bloque— y preferimos texto fiel a color equivocado.
 *
 * Componente presentacional y controlado. No valida, no ejecuta el código y no
 * revela ni `errorLines` ni `errorType`: nada de eso llega al DOM.
 *
 * Un paso mal formado lanza en lugar de renderizar algo a medias: §27 trata el
 * contenido inválido como no recuperable, y el ErrorBoundary lo recoge.
 */

export interface FindErrorStepProps {
  step: ExerciseStep;
  value: FindErrorSelection;
  onChange: (next: FindErrorSelection) => void;
  /** Bloquea la elección, por ejemplo una vez validada la respuesta. */
  disabled?: boolean;
  className?: string;
}

const ROW =
  'flex min-h-11 cursor-pointer items-start gap-3 border-l-2 px-3 py-2.5 text-sm transition-colors focus-within:ring-2 focus-within:ring-inset focus-within:ring-ring';

export function FindErrorStep({
  step,
  value,
  onChange,
  disabled = false,
  className,
}: FindErrorStepProps) {
  const groupId = useId();

  if (step.type !== 'find-error') {
    throw new Error(
      `FindErrorStep recibió un paso de tipo ${step.type}: solo renderiza pasos find-error`,
    );
  }

  if (step.code === null) {
    throw new Error(`El paso ${step.id} no declara código en el que buscar el error`);
  }

  if (step.options === null || step.options.length === 0) {
    throw new Error(`El paso ${step.id} no declara opciones que mostrar`);
  }

  const lines = step.code.split('\n');

  return (
    <fieldset disabled={disabled} className={cn('min-w-0', className)}>
      <legend className="mb-4 text-base font-medium text-foreground">
        {step.prompt}
      </legend>

      <fieldset className="mb-6 min-w-0">
        <legend className="mb-2 text-sm font-medium text-foreground">
          Línea del error
        </legend>

        <ul className="overflow-hidden rounded-md border border-code-border bg-code font-mono">
          {lines.map((text, index) => {
            const line = index + 1;
            const selected = line === value.line;

            return (
              <li key={line}>
                <label
                  className={cn(
                    ROW,
                    selected
                      ? 'border-primary bg-primary/10 text-foreground'
                      : 'border-transparent text-foreground hover:bg-accent',
                    disabled && 'cursor-not-allowed opacity-60 hover:bg-transparent',
                  )}
                >
                  <input
                    type="radio"
                    name={`${groupId}-line`}
                    value={line}
                    checked={selected}
                    onChange={() => onChange({ ...value, line })}
                    disabled={disabled}
                    className="mt-0.5 size-4 shrink-0 accent-primary"
                  />
                  <span className="sr-only">Línea {line}</span>
                  <span
                    aria-hidden="true"
                    className="w-5 shrink-0 select-none text-right tabular-nums text-muted-foreground"
                  >
                    {line}
                  </span>
                  <span className="min-w-0 whitespace-pre-wrap break-words">{text}</span>
                </label>
              </li>
            );
          })}
        </ul>
      </fieldset>

      <fieldset className="min-w-0">
        <legend className="mb-2 text-sm font-medium text-foreground">
          Tipo de error
        </legend>

        <ul className="flex flex-col gap-2">
          {step.options.map((option) => {
            const selected = option.id === value.errorType;

            return (
              <li key={option.id}>
                <label
                  className={cn(
                    'flex min-h-11 cursor-pointer items-center gap-3 rounded-md border px-4 py-3 text-sm transition-colors',
                    'focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background',
                    selected
                      ? 'border-primary bg-primary/10 text-foreground'
                      : 'border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground',
                    disabled && 'cursor-not-allowed opacity-60 hover:bg-card',
                  )}
                >
                  <input
                    type="radio"
                    name={`${groupId}-type`}
                    value={option.id}
                    checked={selected}
                    onChange={() => onChange({ ...value, errorType: option.id })}
                    disabled={disabled}
                    className="size-4 shrink-0 accent-primary"
                  />
                  <span className="min-w-0">{option.text}</span>
                </label>
              </li>
            );
          })}
        </ul>
      </fieldset>
    </fieldset>
  );
}
