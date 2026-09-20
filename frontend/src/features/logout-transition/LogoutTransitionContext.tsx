import {
  type ReactNode,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  LogoutTransitionContext,
  type LogoutTransitionContextValue,
} from './logout-transition-context';

import './logout-transition.css';

const EXIT_ANIMATION_MS = 900;
const FAREWELL_MESSAGE_MS = 5_500;

type LogoutTransitionPhase =
  | 'idle'
  | 'exiting'
  | 'farewell';

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}

export function LogoutTransitionProvider({
  children,
}: {
  readonly children: ReactNode;
}) {
  const [phase, setPhase] =
    useState<LogoutTransitionPhase>('idle');

  const pendingRef =
    useRef<Promise<void> | null>(null);

  const runLogoutTransition =
    useCallback(
      (
        logoutAction: () => Promise<void>,
        onFinished?: () => void,
      ): Promise<void> => {
        if (pendingRef.current !== null) {
          return pendingRef.current;
        }

        const promise =
          (async () => {
            setPhase('exiting');

            const logoutPromise =
              logoutAction().catch(() => {
                /*
                 * AuthContext mantiene la responsabilidad
                 * de limpiar la autenticación local.
                 */
              });

            await wait(EXIT_ANIMATION_MS);

            setPhase('farewell');

            await logoutPromise;

            await wait(FAREWELL_MESSAGE_MS);

            onFinished?.();

            setPhase('idle');
          })().finally(() => {
            pendingRef.current = null;
          });

        pendingRef.current = promise;

        return promise;
      },
      [],
    );

  const value =
    useMemo<LogoutTransitionContextValue>(
      () => ({
        active: phase !== 'idle',
        runLogoutTransition,
      }),
      [
        phase,
        runLogoutTransition,
      ],
    );

  return (
    <LogoutTransitionContext.Provider
      value={value}
    >
      {children}

      {phase !== 'idle' && (
        <div
          className={`codegym-logout-transition codegym-logout-transition--${phase}`}
          role="status"
          aria-live="polite"
          aria-label={
            phase === 'exiting'
              ? 'Cerrando sesión'
              : 'Sesión cerrada'
          }
        >
          <div
            aria-hidden="true"
            className="codegym-logout-transition__grid"
          />

          <div
            aria-hidden="true"
            className="codegym-logout-transition__veil"
          />

          {phase === 'exiting' && (
            <div
              className="codegym-logout-transition__exit-copy"
            >
              <span
                className="codegym-logout-transition__exit-dot"
              />
              <span>Cerrando sesión</span>
            </div>
          )}

          {phase === 'farewell' && (
            <section
              className="codegym-logout-transition__message"
              aria-labelledby="logout-farewell-title"
            >
              <div
                aria-hidden="true"
                className="codegym-logout-transition__message-icon"
              >
                &lt;/&gt;
              </div>

              <p
                className="codegym-logout-transition__eyebrow"
              >
                SESIÓN COMPLETADA
              </p>

              <h2
                id="logout-farewell-title"
                className="codegym-logout-transition__title"
              >
                Buen trabajo por hoy.
              </h2>

              <p
                className="codegym-logout-transition__description"
              >
                Tu progreso queda guardado.
                Sigue construyendo, practicando
                y mejorando. Te esperamos pronto
                en CodeGym.
              </p>

              <div
                aria-hidden="true"
                className="codegym-logout-transition__progress"
              >
                <span />
              </div>
            </section>
          )}
        </div>
      )}
    </LogoutTransitionContext.Provider>
  );
}
