import {
  ShieldAlert,
  X,
} from 'lucide-react';

import {
  useEffect,
  useRef,
} from 'react';


interface AccountLockDialogProps {
  readonly open: boolean;

  onClose(): void;

  onRecover(): void;
}


const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');


export function AccountLockDialog({
  open,
  onClose,
  onRecover,
}: AccountLockDialogProps) {
  const dialogRef =
    useRef<HTMLDivElement>(
      null,
    );

  const recoverButtonRef =
    useRef<HTMLButtonElement>(
      null,
    );

  const previousFocusRef =
    useRef<HTMLElement | null>(
      null,
    );


  useEffect(
    () => {
      if (
        !open
      ) {
        return;
      }

      previousFocusRef.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;

      const previousOverflow =
        document.body.style
          .overflow;

      document.body.style.overflow =
        'hidden';

      window.requestAnimationFrame(
        () => {
          recoverButtonRef
            .current
            ?.focus();
        },
      );

      const handleKeyDown = (
        event:
          globalThis.KeyboardEvent,
      ) => {
        if (
          event.key ===
          'Escape'
        ) {
          event.preventDefault();

          onClose();

          return;
        }

        if (
          event.key !==
          'Tab'
        ) {
          return;
        }

        const dialog =
          dialogRef.current;

        if (
          dialog === null
        ) {
          return;
        }

        const focusable =
          Array.from(
            dialog.querySelectorAll<HTMLElement>(
              FOCUSABLE_SELECTOR,
            ),
          ).filter(
            (
              element,
            ) =>
              !element.hasAttribute(
                'disabled',
              )
              && element.getAttribute(
                'aria-hidden',
              ) !== 'true',
          );

        if (
          focusable.length ===
          0
        ) {
          event.preventDefault();

          dialog.focus();

          return;
        }

        const first =
          focusable[0];

        const last =
          focusable[
            focusable.length - 1
          ];

        if (
          event.shiftKey
          && document.activeElement
            === first
        ) {
          event.preventDefault();

          last?.focus();

          return;
        }

        if (
          !event.shiftKey
          && document.activeElement
            === last
        ) {
          event.preventDefault();

          first?.focus();
        }
      };

      document.addEventListener(
        'keydown',
        handleKeyDown,
      );

      return () => {
        document.removeEventListener(
          'keydown',
          handleKeyDown,
        );

        document.body.style.overflow =
          previousOverflow;

        window.requestAnimationFrame(
          () => {
            previousFocusRef
              .current
              ?.focus();
          },
        );
      };
    },

    [
      open,
      onClose,
    ],
  );


  if (
    !open
  ) {
    return null;
  }


  return (
    <div
      className="account-lock-backdrop"
      aria-hidden={false}
      onMouseDown={(
        event,
      ) => {
        if (
          event.target
          === event.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <div
        ref={dialogRef}
        className="account-lock-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="account-lock-title"
        aria-describedby="account-lock-description"
        tabIndex={-1}
      >
        <button
          type="button"
          className="account-lock-close"
          aria-label="Cerrar aviso de seguridad"
          onClick={
            onClose
          }
        >
          <X
            aria-hidden="true"
          />
        </button>

        <div
          className="account-lock-icon"
          aria-hidden="true"
        >
          <ShieldAlert />
        </div>

        <div className="account-lock-copy">
          <span className="account-lock-eyebrow">
            Seguridad de la cuenta
          </span>

          <h2
            id="account-lock-title"
          >
            Tu cuenta ha sido bloqueada
          </h2>

          <p
            id="account-lock-description"
          >
            Detectamos demasiados intentos fallidos de
            inicio de sesión y hemos bloqueado el acceso
            para proteger tu cuenta.
          </p>
        </div>

        <div className="account-lock-security-note">
          <span aria-hidden="true">
            ●
          </span>

          <p>
            No se puede crear una nueva sesión mientras
            la cuenta permanezca bloqueada.
          </p>
        </div>

        <div className="account-lock-actions">
          <button
            ref={recoverButtonRef}
            type="button"
            className="account-lock-primary"
            onClick={
              onRecover
            }
          >
            Recuperar acceso
          </button>

          <button
            type="button"
            className="account-lock-secondary"
            onClick={
              onClose
            }
          >
            Volver al inicio de sesión
          </button>
        </div>

        <p className="account-lock-help">
          Si tú no realizaste estos intentos, cambia tu
          contraseña durante la recuperación.
        </p>
      </div>
    </div>
  );
}
