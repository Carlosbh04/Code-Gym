import { cn } from '@/lib/utils';
import type { RevealedHint } from '@/types/exercise';

/**
 * Pista que se revela progresivamente (§6, §12).
 *
 * §6 fija la mecánica: «el usuario revela una pista a la vez». Este componente
 * muestra únicamente las ya autorizadas por backend y ofrece pedir la
 * siguiente. No conoce ni recibe textos futuros.
 *
 * Sin pistas no hay nada que ofrecer y no se renderiza: un botón que nunca se
 * puede usar es ruido para todo el mundo, y para quien navega con teclado o
 * lector de pantalla es una parada inútil.
 */
export interface HintRevealProps {
  /** Cantidad pública de pistas disponibles; nunca incluye sus textos. */
  totalHints: number;
  /** Únicos textos ya entregados por el backend. */
  revealedHints: readonly RevealedHint[];
  /** Pide la siguiente pista. */
  onReveal: () => void;
  /** Hay una petición de reveal en curso. */
  isRevealing?: boolean;
  /** Bloquea pedir más, por ejemplo una vez respondido el paso. */
  disabled?: boolean;
  className?: string;
}

const BUTTON =
  'inline-flex min-h-11 items-center justify-center rounded-md border border-border px-4 py-2.5 text-sm font-medium text-foreground ring-offset-background transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50';

export function HintReveal({
  totalHints,
  revealedHints,
  onReveal,
  isRevealing = false,
  disabled = false,
  className,
}: HintRevealProps) {
  if (totalHints === 0) {
    return null;
  }

  const quedan = Math.max(
    0,
    totalHints - revealedHints.length,
  );
  const agotadas = quedan === 0;

  return (
    <section
      aria-label="Pistas"
      className={cn('rounded-md border border-border bg-card p-4', className)}
    >
      {/* La región vive siempre en el DOM: si apareciera con la primera pista,
          el lector de pantalla no anunciaría el cambio. */}
      <ol
        aria-live="polite"
        className={cn('flex flex-col gap-3', revealedHints.length > 0 && 'mb-4')}
      >
        {revealedHints.map((hint) => (
          <li key={hint.index}>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Pista {hint.index + 1} de {totalHints}
            </p>
            <p className="mt-1 text-sm text-foreground">{hint.text}</p>
          </li>
        ))}
      </ol>

      <button
        type="button"
        onClick={() => onReveal()}
        disabled={disabled || agotadas || isRevealing}
        aria-busy={isRevealing}
        className={BUTTON}
      >
        {isRevealing
          ? 'Mostrando pista…'
          : agotadas
          ? 'No quedan más pistas'
          : revealedHints.length === 0
            ? `Ver una pista (${totalHints} disponibles)`
            : `Ver otra pista (queda${quedan === 1 ? '' : 'n'} ${quedan})`}
      </button>
    </section>
  );
}
