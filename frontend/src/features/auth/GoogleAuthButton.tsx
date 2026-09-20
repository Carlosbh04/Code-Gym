import {
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  getGoogleClientId,
  loadGoogleIdentityServices,
  type GoogleCredentialResponse,
} from './google-identity';

interface GoogleAuthButtonProps {
  label: string;
  onCredential(
    credential: string,
  ): void;
  onError?(
    error: Error,
  ): void;
  disabled?: boolean;
}

export function GoogleAuthButton({
  label,
  onCredential,
  onError,
  disabled = false,
}: GoogleAuthButtonProps) {
  const containerRef =
    useRef<HTMLDivElement>(
      null,
    );

  const callbackRef =
    useRef(onCredential);

  const errorRef =
    useRef(onError);

  const [
    isReady,
    setIsReady,
  ] =
    useState(false);

  useEffect(
    () => {
      callbackRef.current =
        onCredential;

      errorRef.current =
        onError;
    },
    [
      onCredential,
      onError,
    ],
  );

  useEffect(
    () => {
      let active = true;

      const setup = async () => {
        try {
          const api =
            await loadGoogleIdentityServices();

          if (
            !active
            || containerRef.current === null
          ) {
            return;
          }

          api.initialize({
            client_id:
              getGoogleClientId(),
            callback: (
              response:
                GoogleCredentialResponse,
            ) => {
              const credential =
                response.credential;

              if (!credential) {
                errorRef.current?.(
                  new Error(
                    'Google no devolvió una credencial válida.',
                  ),
                );
                return;
              }

              callbackRef.current(
                credential,
              );
            },
          });

          containerRef.current
            .replaceChildren();

          api.renderButton(
            containerRef.current,
            {
              type: 'standard',
              theme: 'outline',
              size: 'large',
              text:
                label
                  .toLowerCase()
                  .includes(
                    'registr',
                  )
                  ? 'signup_with'
                  : 'continue_with',
              shape: 'pill',
              logo_alignment:
                'left',
              width: 400,
            },
          );

          if (active) {
            setIsReady(
              true,
            );
          }
        } catch (error) {
          if (!active) {
            return;
          }

          errorRef.current?.(
            error instanceof Error
              ? error
              : new Error(
                  'No se pudo inicializar Google.',
                ),
          );
        }
      };

      void setup();

      return () => {
        active = false;
      };
    },
    [
      label,
    ],
  );

  return (
    <div
      className="auth-google-wrap"
      aria-disabled={
        disabled
          ? 'true'
          : undefined
      }
    >
      <div
        ref={containerRef}
        className={
          disabled
            ? 'auth-google-slot pointer-events-none opacity-50'
            : 'auth-google-slot'
        }
      />

      {!isReady ? (
        <button
          type="button"
          disabled
          className="auth-google-button"
        >
          Cargando Google…
        </button>
      ) : null}
    </div>
  );
}
