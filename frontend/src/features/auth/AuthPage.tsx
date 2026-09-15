import { Braces } from 'lucide-react';

import { AuthPanel } from './AuthPanel';
import { TypewriterCode } from './TypewriterCode';
import type { AuthMode } from './auth-types';
import './auth-page.css';

interface AuthPageProps {
  initialMode?: AuthMode;
}

export default function AuthPage({ initialMode = 'login' }: AuthPageProps) {
  return (
    <main className="auth-page">
      <div className="auth-page__orb" aria-hidden="true" />

      <div className="relative z-10 mx-auto grid min-h-screen w-full max-w-[90rem] items-center gap-10 px-5 py-8 md:grid-cols-[minmax(0,0.9fr)_minmax(28rem,0.72fr)] md:px-8 md:py-10 lg:gap-16 lg:px-12 xl:gap-20 xl:px-16">
        <section
          className="auth-hero min-w-0 md:max-w-[38rem]"
          aria-labelledby="auth-hero-title"
        >
          <div className="auth-logo-entry flex items-center gap-3" aria-label="CodeGym">
            <span className="flex size-11 items-center justify-center rounded-xl border border-code-accent/40 bg-code-accent/10 text-code-accent shadow-[0_0_28px_hsl(var(--code-accent)/0.12)]">
              <Braces className="size-6" aria-hidden="true" />
            </span>

            <span className="text-2xl font-extrabold tracking-[-0.04em] text-code-foreground">
              Code<span className="text-code-accent">Gym</span>
            </span>
          </div>

          <div className="auth-brand-entry mt-12 md:mt-14">
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-code-accent sm:text-sm">
              // Practica. Aprende. Mejora.
            </p>

            <h1
              id="auth-hero-title"
              className="auth-hero-title"
            >
              <span
                className="auth-hero-title-line auth-hero-title-line--one"
                data-text="Los desarrolladores"
              >
                Los desarrolladores
              </span>{' '}
              <span
                className="auth-hero-title-line auth-hero-title-line--two"
                data-text="también entrenan."
              >
                también entrenan.
              </span>
            </h1>
          </div>

          <div className="auth-code-entry mt-9 max-w-[34rem]">
            <TypewriterCode />

            <p className="mt-5 font-mono text-xs tracking-[0.12em] text-code-muted sm:text-sm">
              Código hoy. Oportunidades mañana.
            </p>
          </div>
        </section>

        <div className="auth-panel-entry flex min-w-0 items-center md:justify-end">
          <AuthPanel initialMode={initialMode} />
        </div>
      </div>
    </main>
  );
}
