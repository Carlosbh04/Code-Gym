import {
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';

import {
  useNavigate,
} from 'react-router-dom';

import {
  ApiError,
} from '@/lib/api/http-client';

import {
  useAuth,
} from './AuthContext';

import {
  LoginForm,
} from './LoginForm';

import {
  RegisterForm,
} from './RegisterForm';

import type {
  AuthMode,
} from './auth-types';

import type {
  LoginInput,
  RegisterInput,
} from './auth-api';

interface AuthPanelProps {
  initialMode?: AuthMode;
}

const MODES:
  readonly AuthMode[] = [
    'login',
    'register',
  ];

export function AuthPanel({
  initialMode = 'login',
}: AuthPanelProps) {
  const [
    mode,
    setMode,
  ] =
    useState<AuthMode>(
      initialMode,
    );

  const [
    direction,
    setDirection,
  ] =
    useState<
      'forward'
      | 'backward'
    >(
      initialMode === 'register'
        ? 'forward'
        : 'backward',
    );

  const [
    notice,
    setNotice,
  ] =
    useState('');

  const [
    registerNotice,
    setRegisterNotice,
  ] =
    useState('');

  const [
    isSubmitting,
    setIsSubmitting,
  ] =
    useState(false);

  const [
    loginLocked,
    setLoginLocked,
  ] =
    useState(false);

  const loginTabRef =
    useRef<HTMLButtonElement>(
      null,
    );

  const registerTabRef =
    useRef<HTMLButtonElement>(
      null,
    );

  const {
    login,
    googleLogin,
    register,
  } =
    useAuth();

  const navigate =
    useNavigate();

  const selectMode = (
    nextMode: AuthMode,
    focusTab = false,
  ) => {
    if (
      nextMode === mode
    ) {
      return;
    }

    setDirection(
      nextMode === 'register'
        ? 'forward'
        : 'backward',
    );

    setMode(
      nextMode,
    );

    setNotice('');
    setLoginLocked(false);
    setRegisterNotice('');

    if (
      focusTab
    ) {
      window.requestAnimationFrame(
        () => {
          (
            nextMode === 'login'
              ? loginTabRef
              : registerTabRef
          ).current?.focus();
        },
      );
    }
  };

  const handleTabKeyDown = (
    event:
      KeyboardEvent<HTMLButtonElement>,
  ) => {
    const currentIndex =
      MODES.indexOf(
        mode,
      );

    let nextIndex:
      number | null =
        null;

    if (
      event.key === 'ArrowRight'
    ) {
      nextIndex =
        (
          currentIndex + 1
        ) % MODES.length;
    }

    if (
      event.key === 'ArrowLeft'
    ) {
      nextIndex =
        (
          currentIndex
          - 1
          + MODES.length
        ) % MODES.length;
    }

    if (
      event.key === 'Home'
    ) {
      nextIndex = 0;
    }

    if (
      event.key === 'End'
    ) {
      nextIndex =
        MODES.length - 1;
    }

    if (
      nextIndex === null
    ) {
      return;
    }

    event.preventDefault();

    selectMode(
      MODES[nextIndex],
      true,
    );
  };
  const handleGoogleCredential =
    async (
      credential: string,
    ) => {
      setIsSubmitting(
        true,
      );
      setNotice('');

      try {
        await googleLogin({
          idToken:
            credential,
        });

        navigate(
          '/',
          {
            replace: true,
            state: {
              postLoginIntro: true,
            },
          },
        );
      } catch (error) {
        if (
          error instanceof ApiError
        ) {
          if (
            error.status === 409
            && error.code
              === 'GOOGLE_EMAIL_ALREADY_REGISTERED'
          ) {
            setNotice(
              'Ya existe una cuenta asociada a este correo. Inicia sesión o recupera tu contraseña.',
            );
            return;
          }

          if (
            error.status === 401
          ) {
            setNotice(
              'No se pudo verificar tu cuenta de Google.',
            );
            return;
          }

          setNotice(
            error.message,
          );
          return;
        }

        setNotice(
          'No se pudo conectar con el servidor.',
        );
      } finally {
        setIsSubmitting(
          false,
        );
      }
    };

  const handleGoogleError = (
    _error: Error,
  ) => {
    setNotice(
      'No se pudo iniciar Google. Inténtalo de nuevo.',
    );
  };


  const handleLogin =
    async (
      input: LoginInput,
    ) => {
      setIsSubmitting(
        true,
      );

      setNotice('');

      try {
        await login(
          input,
        );

        navigate(
          '/',
          {
            replace: true,
            state: {
              postLoginIntro: true,
            },
          },
        );
      } catch (error) {
        if (
          error instanceof ApiError
        ) {
          if (
            error.status === 429
          ) {
            setLoginLocked(
              true,
            );
            setNotice(
              'Demasiados intentos fallidos. Inténtalo de nuevo en 15 minutos.',
            );
            return;
          }

          if (
            error.status === 401
          ) {
            setNotice(
              'Email o contraseña incorrectos.',
            );

            return;
          }

          setNotice(
            error.message,
          );

          return;
        }

        setNotice(
          'No se pudo conectar con el servidor.',
        );
      } finally {
        setIsSubmitting(
          false,
        );
      }
    };

  const handleRegister =
    async (
      input: RegisterInput,
    ) => {
      setIsSubmitting(
        true,
      );

      setRegisterNotice('');

      try {
        await register(
          input,
        );

        navigate(
          '/',
          {
            replace: true,
          },
        );
      } catch (error) {
        if (
          error instanceof ApiError
        ) {
          if (
            error.status === 409
          ) {
            setRegisterNotice(
              'Ya existe una cuenta asociada a este correo. Inicia sesión o recupera tu contraseña.',
            );

            return;
          }

          setRegisterNotice(
            error.message,
          );

          return;
        }

        setRegisterNotice(
          'No se pudo conectar con el servidor.',
        );
      } finally {
        setIsSubmitting(
          false,
        );
      }
    };

  const isLogin =
    mode === 'login';

  return (
    <section
      className="auth-panel-shell"
      data-mode={mode}
      aria-labelledby="auth-panel-title"
      aria-busy={
        isSubmitting
          ? 'true'
          : 'false'
      }
    >
      <header className="auth-panel-header">
        <h1
          id="auth-panel-title"
          className="auth-panel-title"
          aria-label={isLogin ? 'Bienvenido' : 'Crea tu cuenta'}
        >
          {isLogin ? (
            <>
              Bien<span>venido</span>
            </>
          ) : (
            <>
              Crea tu <span>cuenta</span>
            </>
          )}
        </h1>

        <p className="auth-panel-subtitle">
          <span>Tu espacio para practicar,</span>
          <span>aprender y mejorar.</span>
        </p>
      </header>

      <div
        className="auth-tabs relative grid grid-cols-2 border-b border-code-border"
        role="tablist"
        aria-label="Acceso a CodeGym"
      >
        <span
          className="auth-tab-indicator"
          data-mode={mode}
          aria-hidden="true"
        />

        <button
          ref={loginTabRef}
          id="login-tab"
          type="button"
          role="tab"
          aria-selected={
            isLogin
          }
          aria-controls="auth-form-panel"
          tabIndex={
            isLogin
              ? 0
              : -1
          }
          onClick={() =>
            selectMode(
              'login',
            )
          }
          onKeyDown={
            handleTabKeyDown
          }
          className="auth-tab"
          disabled={
            isSubmitting
          }
        >
          Iniciar sesión
        </button>

        <button
          ref={
            registerTabRef
          }
          id="register-tab"
          type="button"
          role="tab"
          aria-selected={
            !isLogin
          }
          aria-controls="auth-form-panel"
          tabIndex={
            isLogin
              ? -1
              : 0
          }
          onClick={() =>
            selectMode(
              'register',
            )
          }
          onKeyDown={
            handleTabKeyDown
          }
          className="auth-tab"
          disabled={
            isSubmitting
          }
        >
          Crear cuenta
        </button>
      </div>

      <div className="px-5 py-6 sm:px-10 sm:py-7">
        <div
          key={mode}
          id="auth-form-panel"
          role="tabpanel"
          aria-labelledby={
            isLogin
              ? 'login-tab'
              : 'register-tab'
          }
          className="auth-form-swap"
          data-direction={
            direction
          }
        >
          {isLogin ? (
            <LoginForm
              onSubmit={
                handleLogin
              }

              onGoogle={
                handleGoogleCredential
              }
              onGoogleError={
                handleGoogleError
              }

              onForgotPassword={() =>
                navigate(
                  '/forgot-password',
                )
              }

              onChangeMode={() =>
                selectMode(
                  'register',
                )
              }
              isLocked={
                loginLocked
              }
              lockedMessage={
                loginLocked
                  ? notice
                  : ''
              }
              onEmailChange={() => {
                if (
                  loginLocked
                ) {
                  setLoginLocked(
                    false,
                  );
                  setNotice('');
                }
              }}
            />
          ) : (
            <RegisterForm
              onSubmit={
                handleRegister
              }

              onGoogle={
                handleGoogleCredential
              }
              onGoogleError={
                handleGoogleError
              }

              onChangeMode={() =>
                selectMode(
                  'login',
                )
              }

              isSubmitting={
                isSubmitting
              }
              submitNotice={
                registerNotice
              }
              onClearSubmitNotice={() =>
                setRegisterNotice('')
              }
            />
          )}
        </div>

        <p
          className="mt-4 min-h-5 text-center text-xs text-code-muted"
          role="status"
          aria-live="polite"
        >
          {
            isSubmitting
              ? 'Procesando…'
              : loginLocked
                ? ''
                : notice
          }
        </p>
      </div>
    </section>
  );
}
