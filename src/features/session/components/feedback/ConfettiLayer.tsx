import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { cn } from '@/lib/utils';

export type ConfettiIntensity = 'low' | 'medium' | 'high';
export type ConfettiMode = 'toast' | 'modal' | 'inline' | 'code' | 'milestone' | 'complete';

export interface ConfettiLayerProps {
  /** Identificador canónico del éxito que se celebra. Un id solo se anima una vez. */
  eventId: string | null;
  /** Cada contexto mantiene su propia densidad, alcance y duración. */
  mode?: ConfettiMode;
  /** Compatibilidad temporal con los llamadores anteriores. */
  intensity?: ConfettiIntensity;
  className?: string;
}

interface ModeConfig {
  particles: number;
  duration: number;
  viewport: boolean;
}

const MODES: Record<ConfettiMode, ModeConfig> = {
  toast: { particles: 16, duration: 1150, viewport: true },
  modal: { particles: 14, duration: 1400, viewport: false },
  inline: { particles: 4, duration: 750, viewport: false },
  code: { particles: 8, duration: 1050, viewport: false },
  milestone: { particles: 14, duration: 1300, viewport: false },
  complete: { particles: 56, duration: 2400, viewport: true },
};

const LEGACY_MODES: Record<ConfettiIntensity, ConfettiMode> = {
  low: 'toast',
  medium: 'code',
  high: 'complete',
};

function prefersReducedMotion() {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Celebración exclusivamente visual. La configuración se deriva una vez del
 * eventId: no hay aleatoriedad por render ni efectos globales para éxitos locales.
 */
export function ConfettiLayer({ eventId, mode, intensity, className }: ConfettiLayerProps) {
  const resolvedMode = mode ?? (intensity === undefined ? 'inline' : LEGACY_MODES[intensity]);
  const config = MODES[resolvedMode];
  const seenEvents = useRef(new Set<string>());
  const [activeEvent, setActiveEvent] = useState<string | null>(eventId);
  const [reducedMotion, setReducedMotion] = useState(prefersReducedMotion);

  const particles = useMemo(() => {
    if (eventId === null) return [];
    const seed = Array.from(`${eventId}:${resolvedMode}`).reduce(
      (total, character) => (total * 31 + character.charCodeAt(0)) >>> 0,
      17,
    );

    return Array.from({ length: config.particles }, (_, index) => {
      const value = (seed + index * 7919) >>> 0;
      const local = !config.viewport;
      const left = local ? 18 + (value % 65) : 3 + (value % 94);
      const top = local
        ? 18 + ((value >>> 7) % 58)
        : resolvedMode === 'toast' ? 4 + ((value >>> 7) % 30) : -4 + ((value >>> 7) % 50);
      const x = local ? -48 + ((value >>> 13) % 97) : -90 + ((value >>> 13) % 181);
      const y = local
        ? -46 + ((value >>> 20) % 92)
        : resolvedMode === 'toast' ? 55 + ((value >>> 20) % 105) : 220 + ((value >>> 20) % 380);
      return { left, top, x, y, delay: (index % 7) * 42, size: 5 + ((value >>> 4) % 5), rotate: value % 180, color: index % 5 };
    });
  }, [config.particles, config.viewport, eventId, resolvedMode]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;

    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener?.('change', update);
    return () => query.removeEventListener?.('change', update);
  }, []);

  useEffect(() => {
    if (eventId === null) return;

    const isNewEvent = !seenEvents.current.has(eventId);
    seenEvents.current.add(eventId);
    const activate = isNewEvent ? window.setTimeout(() => setActiveEvent(eventId), 0) : null;
    const timeout = window.setTimeout(() => setActiveEvent(null), config.duration);
    return () => {
      if (activate !== null) window.clearTimeout(activate);
      window.clearTimeout(timeout);
    };
  }, [config.duration, eventId]);

  if (activeEvent === null || activeEvent !== eventId || reducedMotion) return null;

  return (
    <div
      aria-hidden="true"
      data-confetti-event={activeEvent}
      data-confetti-mode={resolvedMode}
      className={cn(
        'pointer-events-none overflow-hidden motion-reduce:hidden',
        config.viewport ? 'fixed inset-0 z-50' : 'absolute inset-0 z-10',
        className,
      )}
    >
      {particles.map((particle, index) => (
        <span
          key={`${activeEvent}:${index}`}
          className="absolute block rounded-[2px] animate-[codegym-confetti_var(--confetti-duration)_cubic-bezier(0.16,1,0.3,1)_forwards]"
          style={{
            left: `${particle.left}%`,
            top: `${particle.top}%`,
            width: `${particle.size}px`,
            height: `${Math.max(4, particle.size - 2)}px`,
            animationDelay: `${particle.delay}ms`,
            backgroundColor: ['hsl(var(--accent-text))', 'hsl(var(--success))', 'hsl(var(--warning))', 'hsl(var(--celebration-pink))', 'hsl(var(--primary))'][particle.color],
            '--confetti-duration': `${config.duration}ms`,
            '--confetti-x': `${particle.x}px`,
            '--confetti-y': `${particle.y}px`,
            '--confetti-rotate-start': `${particle.rotate}deg`,
            '--confetti-rotate-end': `${particle.rotate + 240}deg`,
          } as CSSProperties}
        />
      ))}
    </div>
  );
}
