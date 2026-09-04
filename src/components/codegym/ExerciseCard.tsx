import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** Estado visual común que existe en el flujo de sesión actual. */
export type ExerciseCardState = 'default' | 'answered';

export interface ExerciseCardProps {
  /** Contenido específico del step: opciones, editor, pistas y feedback. */
  children: ReactNode;
  /** El paso ya fue respondido, sin inferir si la respuesta fue correcta. */
  state?: ExerciseCardState;
  className?: string;
}

/**
 * Contenedor visual y semántico de un ejercicio (T059).
 *
 * No valida respuestas ni conoce los tipos de step. El estado `answered` solo
 * comunica que el ejercicio ya se respondió; la corrección sigue perteneciendo
 * a ResultFeedback para no duplicar su significado ni su feedback accesible.
 */
export function ExerciseCard({
  children,
  state = 'default',
  className,
}: ExerciseCardProps) {
  const answered = state === 'answered';

  return (
    <article
      aria-label={answered ? 'Ejercicio respondido' : 'Ejercicio actual'}
      data-state={state}
      className={cn(
        'min-w-0 animate-fade-in-up rounded-2xl border bg-card p-4 sm:p-6 lg:p-7',
        answered ? 'border-primary/60 bg-primary/5' : 'border-border',
        className,
      )}
    >
      {children}
    </article>
  );
}
