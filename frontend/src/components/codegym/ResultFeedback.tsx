import { CircleCheck, CircleX } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ConfettiLayer } from '@/features/session/components/feedback/ConfettiLayer';

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
  successMessage?: string;
  successEventId?: string | null;
  className?: string;
}

export function ResultFeedback({
  isCorrect,
  explanation,
  successMessage,
  successEventId = null,
  className,
}: ResultFeedbackProps) {
  const Icon = isCorrect ? CircleCheck : CircleX;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'relative flex flex-col gap-2 overflow-hidden rounded-md border p-4',
        isCorrect
          ? 'animate-correct-pulse border-success bg-success/10'
          : 'animate-shake border-destructive bg-destructive/10',
        className,
      )}
    >
      {isCorrect && <ConfettiLayer eventId={successEventId} mode="inline" />}
      <p
        className={cn(
          'flex items-center gap-2 text-sm font-semibold',
          isCorrect ? 'text-success' : 'text-destructive',
        )}
      >
        <Icon aria-hidden="true" className="size-5 shrink-0" />
        <span>{isCorrect ? 'Muy bien' : 'Respuesta incorrecta'}</span>
        {isCorrect && successMessage !== undefined ? <span>· {successMessage}</span> : null}
      </p>

      {isCorrect && <span className="text-xs font-medium text-success">Respuesta correcta</span>}
      <p className="text-sm leading-relaxed text-foreground">{explanation}</p>
    </div>
  );
}
