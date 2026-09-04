import { LazyCodeEditor } from '@/components/codegym/LazyCodeEditor';
import { cn } from '@/lib/utils';
import type { ExerciseStep } from '@/types/exercise';

/**
 * Paso de corrección de código (§7): el usuario arregla un fragmento roto.
 *
 * Componente presentacional y controlado. Recoge el código y lo emite hacia
 * arriba; no ejecuta, no valida y no conoce el executor. §24 asigna la
 * validación de este tipo a `validateFixCode`, que ejecuta en el Worker, y
 * esa integración es T042: hasta entonces el paso se puede editar pero no
 * comprobar.
 *
 * El código de partida es el del propio paso. `value` a null significa «aún no
 * lo ha tocado», así que se muestra `step.code` sin copiarlo a ningún estado.
 *
 * Un paso mal formado lanza en lugar de renderizar algo a medias: §27 trata el
 * contenido inválido como no recuperable, y el ErrorBoundary lo recoge.
 */
export interface FixCodeStepProps {
  step: ExerciseStep;
  /** Código escrito por el usuario, o null si todavía no ha editado nada. */
  value: string | null;
  onChange: (code: string) => void;
  /** Bloquea la edición, por ejemplo una vez validada la respuesta. */
  disabled?: boolean;
  /** El workspace ya muestra el enunciado en su panel de problema. */
  showPrompt?: boolean;
  className?: string;
}

export function FixCodeStep({
  step,
  value,
  onChange,
  disabled = false,
  showPrompt = true,
  className,
}: FixCodeStepProps) {
  if (step.type !== 'fix-code') {
    throw new Error(
      `FixCodeStep recibió un paso de tipo ${step.type}: solo renderiza pasos fix-code`,
    );
  }

  if (step.code === null) {
    throw new Error(`El paso ${step.id} no declara código que corregir`);
  }

  return (
    <fieldset
      disabled={disabled}
      aria-label={showPrompt ? undefined : step.prompt}
      className={cn('min-w-0', className)}
    >
      {showPrompt && (
        <legend className="mb-4 text-base font-medium text-foreground">
          {step.prompt}
        </legend>
      )}

      <LazyCodeEditor value={value ?? step.code} onChange={onChange} disabled={disabled} />
    </fieldset>
  );
}
