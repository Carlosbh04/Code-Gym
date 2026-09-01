import { CircleCheck, CircleX } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Feedback posterior a responder un paso (§12): si la respuesta fue correcta y
 * la explicación del ejercicio.
 *
 * Presentacional: recibe el resultado que ya calculó el engine y lo representa.
 * No valida, no puntúa y no ejecuta el código del ejercicio.
 *
 * El resultado no depende solo del color: lleva su etiqueta textual y un icono
 * distinto en cada caso. Es una región viva, de modo que el resultado se anuncia
 * al aparecer sin robar el foco.
 */
export interface ResultFeedbackProps {
  isCorrect: boolean;
  explanation: string;
  className?: string;
}

export function ResultFeedback({
  isCorrect,
  explanation,
  className,
}: ResultFeedbackProps) {
  const Icon = isCorrect ? CircleCheck : CircleX;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'flex flex-col gap-2 rounded-md border p-4',
        isCorrect
          ? 'border-success bg-success/10'
          : 'border-destructive bg-destructive/10',
        className,
      )}
    >
      <p
        className={cn(
          'flex items-center gap-2 text-sm font-semibold',
          isCorrect ? 'text-success' : 'text-destructive',
        )}
      >
        <Icon aria-hidden="true" className="size-5 shrink-0" />
        {isCorrect ? 'Respuesta correcta' : 'Respuesta incorrecta'}
      </p>

      <p className="text-sm leading-relaxed text-foreground">{explanation}</p>
    </div>
  );
}
