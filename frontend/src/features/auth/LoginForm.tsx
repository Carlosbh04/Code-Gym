import {
  Mail,
} from 'lucide-react';

import {
  GoogleAuthButton,
} from './GoogleAuthButton';

import {
  PasswordField,
} from './PasswordField';

import type {
  LoginInput,
} from './auth-api';

interface LoginFormProps {
  onSubmit(
    input: LoginInput,
  ): void;

  onGoogle(
    credential: string,
  ): void;
  onGoogleError?(
    error: Error,
  ): void;

  onForgotPassword(): void;

  onChangeMode(): void;
}

export function LoginForm({
  onSubmit,
  onGoogle,
  onGoogleError,
  onForgotPassword,
  onChangeMode,
}: LoginFormProps) {
  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();

        const formData =
          new FormData(
            event.currentTarget,
          );

        const email =
          formData.get(
            'email',
          );

        const password =
          formData.get(
            'password',
          );

        const remember =
          formData.get(
            'remember',
          ) === 'on';

        if (
          typeof email !== 'string'
          || typeof password !== 'string'
        ) {
          return;
        }

        onSubmit({
          email,
          password,
          remember,
        });
      }}
    >
      <div>
        <label
          htmlFor="login-email"
          className="auth-field-label"
        >
          Email
        </label>

        <div className="auth-input-shell">
          <Mail
            className="auth-input-icon"
            aria-hidden="true"
          />

          <input
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="auth-input"
            placeholder="tu@email.com"
          />
        </div>
      </div>

      <PasswordField
        id="login-password"
        name="password"
        label="Contraseña"
        autoComplete="current-password"
        placeholder="Contraseña"
      />

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <label className="flex min-h-10 cursor-pointer items-center gap-2 text-code-muted">
          <input
            type="checkbox"
            name="remember"
            className="size-4 rounded border-code-border bg-code accent-code-accent"
          />

          Recordarme
        </label>

        <button
          type="button"
          onClick={
            onForgotPassword
          }
          className="min-h-10 rounded-md px-1 font-medium text-code-accent hover:text-code-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-code-accent"
        >
          ¿Olvidaste tu contraseña?
        </button>
      </div>

      <button
        type="submit"
        className="auth-primary-button"
      >
        Iniciar sesión{' '}
        <span aria-hidden="true">
          →
        </span>
      </button>

      <AuthSeparator />

      <GoogleAuthButton
        label="Continuar con Google"
        onCredential={onGoogle}
        onError={onGoogleError}
      />

      <p className="pt-1 text-center text-sm text-code-muted">
        ¿No tienes cuenta?{' '}

        <button
          type="button"
          onClick={
            onChangeMode
          }
          className="font-semibold text-code-accent hover:text-code-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-code-accent"
        >
          Crear cuenta
        </button>
      </p>
    </form>
  );
}

export function AuthSeparator() {
  return (
    <div
      className="flex items-center gap-3"
      aria-hidden="true"
    >
      <span className="h-px flex-1 bg-code-border" />

      <span className="text-xs text-code-muted">
        o continúa con
      </span>

      <span className="h-px flex-1 bg-code-border" />
    </div>
  );
}
