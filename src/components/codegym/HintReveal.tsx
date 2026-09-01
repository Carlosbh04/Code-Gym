import { cn } from '@/lib/utils';

/**
 * Pista que se revela progresivamente (§6, §12).
 *
 * §6 fija la mecánica: «el usuario revela una pista a la vez». Este componente
 * muestra las ya reveladas en el orden del array y ofrece pedir la siguiente;
 * no decide cuál es, no guarda nada y no despacha: `useSession` traduce la
 * petición a `REVEAL_HINT` y el reducer actualiza `hintsRevealed` (§18, D004).
 *
 * Trabaja con la lista de pistas que traiga el paso, sean 0, 1 o las que sean.
 * §6 describe seis niveles de pista, pero el contenido declara los que declara
 * y aquí no se inventan los que falten.
 *
 * Sin pistas no hay nada que ofrecer y no se renderiza: un botón que nunca se
 * puede usar es ruido para todo el mundo, y para quien navega con teclado o
 * lector de pantalla es una parada inútil.
 */
export interface HintRevealProps {
  /** Pistas del paso, en el orden en que deben revelarse. */
  hints: string[];
  /** Cuántas pistas están reveladas. Sale de `state.hintsRevealed.length`. */
  revealedCount: number;
  /** Pide la siguiente pista. */
  onReveal: () => void;
  /** Bloquea pedir más, por ejemplo una vez respondido el paso. */
  disabled?: boolean;
  className?: string;
}

const BUTTON =
  'inline-flex min-h-11 items-center justify-center rounded-md border border-border px-4 py-2.5 text-sm font-medium text-foreground ring-offset-background transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50';

export function HintReveal({
  hints,
  revealedCount,
  onReveal,
  disabled = false,
  className,
}: HintRevealProps) {
  if (hints.length === 0) {
    return null;
  }

  // Nunca se muestran más pistas de las que el paso declara, aunque el contador
  // que llegue sea mayor.
  const revealed = hints.slice(0, Math.max(0, Math.min(revealedCount, hints.length)));
  const quedan = hints.length - revealed.length;
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
        className={cn('flex flex-col gap-3', revealed.length > 0 && 'mb-4')}
      >
        {revealed.map((hint, i) => (
          <li key={i}>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Pista {i + 1} de {hints.length}
            </p>
            <p className="mt-1 text-sm text-foreground">{hint}</p>
          </li>
        ))}
      </ol>

      <button
        type="button"
        onClick={() => onReveal()}
        disabled={disabled || agotadas}
        className={BUTTON}
      >
        {agotadas
          ? 'No quedan más pistas'
          : revealed.length === 0
            ? `Ver una pista (${hints.length} disponibles)`
            : `Ver otra pista (queda${quedan === 1 ? '' : 'n'} ${quedan})`}
      </button>
    </section>
  );
}
