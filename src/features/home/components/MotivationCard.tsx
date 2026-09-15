import {
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { Link } from 'react-router-dom';

import { CodeGymLandscape } from './CodeGymLandscape';

export function MotivationCard({
  variant = 'default',
}: {
  variant?: 'default' | 'advanced';
}) {
  if (variant === 'advanced') {
    return (
      <section
        aria-labelledby="motivation-title"
        className="relative min-h-[220px] overflow-hidden rounded-xl border border-primary/20 bg-card shadow-sm"
      >
        <CodeGymLandscape
          developer
          className="absolute inset-0 size-full"
        />

        <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/65 to-background/5" />

        <div className="relative flex min-h-[220px] max-w-[72%] flex-col justify-center p-5 sm:max-w-[68%]">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">
            Sigue aprendiendo
          </p>

          <h2
            id="motivation-title"
            className="mt-2.5 text-xl font-bold leading-tight tracking-tight text-foreground sm:text-2xl"
          >
            Un mejor desarrollador hoy,
            <span className="block text-primary">
              más libertad mañana.
            </span>
          </h2>

          <p className="mt-2 whitespace-nowrap text-sm leading-relaxed text-muted-foreground">
            Nuevos retos, más habilidades, un mayor futuro.
          </p>

          <Link
            to="/tech"
            className="mt-4 inline-flex min-h-10 w-fit items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Explorar ejercicios

            <ArrowRight
              className="size-4"
              aria-hidden="true"
            />
          </Link>
        </div>

        <p
          aria-hidden="true"
          className="absolute bottom-4 right-4 text-right text-[8px] font-bold uppercase tracking-[0.1em] text-primary/70"
        >
          CÓDIGO HOY.
          <span className="block">
            OPORTUNIDADES
          </span>
          <span className="block">
            MAÑANA.
          </span>
        </p>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="motivation-title"
      className="relative overflow-hidden rounded-2xl border border-primary/25 bg-primary/5 p-5 shadow-sm sm:min-h-56 sm:p-6"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-12 -top-12 size-36 rounded-full bg-primary/15 blur-3xl"
      />

      <div className="relative flex h-full flex-col justify-center gap-3 sm:flex-row sm:items-center sm:gap-4">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
          <Sparkles
            className="size-5"
            aria-hidden="true"
          />
        </span>

        <div className="min-w-0 flex-1">
          <h2
            id="motivation-title"
            className="text-xl font-bold leading-tight tracking-tight text-foreground"
          >
            Pequeños pasos, grandes resultados.
          </h2>

          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            Cada sesión completada convierte la práctica en progreso visible.
          </p>
        </div>
      </div>
    </section>
  );
}
