import {
  useMemo,
  useRef,
} from 'react';

import {
  Clock3,
  LogOut,
} from 'lucide-react';

import {
  useDialogFocus,
} from '@/hooks/useDialogFocus';


interface SessionIdleModalProps {
  readonly open: boolean;

  readonly secondsRemaining: number;

  readonly continuePending: boolean;

  readonly onContinue:
    () => Promise<void>;

  readonly onCloseSession:
    () => Promise<void>;
}


function formatRemainingTime(
  seconds: number,
): string {
  const safeSeconds =
    Math.max(
      0,
      Math.ceil(seconds),
    );

  const minutes =
    Math.floor(
      safeSeconds / 60,
    );

  const remainingSeconds =
    safeSeconds % 60;

  return [
    String(minutes).padStart(
      2,
      '0',
    ),
    String(remainingSeconds).padStart(
      2,
      '0',
    ),
  ].join(':');
}


export function SessionIdleModal({
  open,
  secondsRemaining,
  continuePending,
  onContinue,
  onCloseSession,
}: SessionIdleModalProps) {
  const dialogRef =
    useRef<HTMLElement>(
      null,
    );

  useDialogFocus(
    open,
    dialogRef,
  );

  const progress =
    useMemo(
      () => {
        const boundedSeconds =
          Math.min(
            60,
            Math.max(
              0,
              secondsRemaining,
            ),
          );

        return (
          boundedSeconds
          / 60
        ) * 100;
      },
      [
        secondsRemaining,
      ],
    );

  if (!open) {
    return null;
  }

  const formattedTime =
    formatRemainingTime(
      secondsRemaining,
    );

  return (
    <div
      className="
        fixed inset-0 z-[100]
        flex items-center justify-center
        overflow-y-auto
        bg-background/90
        px-4 py-6
        backdrop-blur-sm
        sm:px-6
      "
    >
      <section
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="session-idle-title"
        aria-describedby="session-idle-description"
        className="
          relative my-auto
          w-full max-w-md
          overflow-hidden
          rounded-2xl
          border border-border
          bg-card
          shadow-2xl shadow-black/40
        "
      >
        <div
          aria-hidden="true"
          className="
            absolute inset-x-0 top-0
            h-px
            bg-primary/70
          "
        />

        <div
          className="
            px-5 pb-5 pt-6
            sm:px-7 sm:pb-6 sm:pt-7
          "
        >
          <div
            className="
              flex flex-col
              items-center
              text-center
            "
          >
            <span
              aria-hidden="true"
              className="
                flex size-14
                items-center justify-center
                rounded-2xl
                border border-primary/25
                bg-primary/10
                text-primary
                shadow-sm
                shadow-primary/10
              "
            >
              <Clock3
                className="size-6"
                strokeWidth={1.8}
              />
            </span>

            <h2
              id="session-idle-title"
              className="
                mt-5
                text-xl font-bold
                tracking-tight
                text-foreground
                sm:text-2xl
              "
            >
              ¿Sigues ahí?
            </h2>

            <p
              id="session-idle-description"
              className="
                mt-2
                max-w-sm
                text-sm
                leading-relaxed
                text-muted-foreground
              "
            >
              No hemos detectado actividad
              durante un tiempo. Confirma que
              quieres continuar para mantener
              tu sesión activa.
            </p>
          </div>

          <div
            className="
              mt-6
              rounded-xl
              border border-border
              bg-background/60
              p-4
            "
          >
            <div
              className="
                flex items-end
                justify-between
                gap-4
              "
            >
              <div>
                <p
                  className="
                    text-xs font-medium
                    text-muted-foreground
                  "
                >
                  La sesión se cerrará en
                </p>

                <p
                  aria-live="polite"
                  aria-atomic="true"
                  className="
                    mt-1
                    font-mono
                    text-2xl font-semibold
                    tabular-nums
                    tracking-tight
                    text-foreground
                  "
                >
                  {formattedTime}
                </p>
              </div>

              <span
                className="
                  text-xs font-medium
                  text-muted-foreground
                "
              >
                1 min
              </span>
            </div>

            <div
              className="
                mt-4 h-1.5
                overflow-hidden
                rounded-full
                bg-muted
              "
              role="progressbar"
              aria-label="Tiempo restante antes de cerrar la sesión"
              aria-valuemin={0}
              aria-valuemax={60}
              aria-valuenow={
                Math.max(
                  0,
                  Math.min(
                    60,
                    Math.ceil(
                      secondsRemaining,
                    ),
                  ),
                )
              }
              aria-valuetext={
                `${formattedTime} restantes`
              }
            >
              <div
                className="
                  h-full
                  rounded-full
                  bg-primary
                  transition-[width]
                  duration-300
                  ease-out
                "
                style={{
                  width:
                    `${progress}%`,
                }}
              />
            </div>
          </div>
        </div>

        <footer
          className="
            grid gap-3
            border-t border-border
            p-5
            sm:grid-cols-2
            sm:p-6
          "
        >
          <button
            type="button"
            data-dialog-autofocus
            disabled={continuePending}
            onClick={() => {
              void onContinue();
            }}
            className="
              inline-flex min-h-11
              items-center justify-center
              rounded-lg
              bg-primary
              px-5 py-2.5
              text-sm font-semibold
              text-primary-foreground
              transition-colors
              hover:bg-primary/90
              focus-visible:outline-none
              focus-visible:ring-2
              focus-visible:ring-ring
              focus-visible:ring-offset-2
              focus-visible:ring-offset-background
              disabled:cursor-not-allowed
              disabled:opacity-60
            "
          >
            {continuePending
              ? 'Continuando…'
              : 'Continuar sesión'}
          </button>

          <button
            type="button"
            disabled={continuePending}
            onClick={() => {
              void onCloseSession();
            }}
            className="
              inline-flex min-h-11
              items-center justify-center
              gap-2
              rounded-lg
              border border-border
              bg-card
              px-5 py-2.5
              text-sm font-semibold
              text-foreground
              transition-colors
              hover:bg-accent
              focus-visible:outline-none
              focus-visible:ring-2
              focus-visible:ring-ring
              focus-visible:ring-offset-2
              focus-visible:ring-offset-background
              disabled:cursor-not-allowed
              disabled:opacity-60
            "
          >
            <LogOut
              aria-hidden="true"
              className="size-4"
            />

            Cerrar sesión
          </button>
        </footer>
      </section>
    </div>
  );
}
