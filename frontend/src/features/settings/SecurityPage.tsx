import {
  CheckCircle2,
  Circle,
  Info,
} from 'lucide-react';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';
import { Link } from 'react-router-dom';

import { useAuth } from '@/features/auth/AuthContext';
import { PasswordField } from '@/features/auth/PasswordField';
import { changePassword } from '@/features/auth/auth-api';
import {
  evaluatePasswordPolicy,
  PASSWORD_MAXIMUM_CODE_POINTS,
  PASSWORD_MINIMUM_CODE_POINTS,
} from '@/features/auth/password-policy';
import {
  calculatePasswordStrength,
  PASSWORD_STRENGTH_LABELS,
} from '@/features/auth/password-strength';
import '@/features/auth/auth-page.css';
import { ApiError } from '@/lib/api/http-client';

interface RequirementItemProps {
  readonly met: boolean;
  readonly children: ReactNode;
}

function RequirementItem({
  met,
  children,
}: RequirementItemProps) {
  const Icon = met
    ? CheckCircle2
    : Circle;

  return (
    <li
      className="flex items-start gap-2.5 text-sm leading-5"
      data-state={met ? 'satisfied' : 'pending'}
    >
      <Icon
        className={met
          ? 'mt-0.5 size-4 shrink-0 text-success'
          : 'mt-0.5 size-4 shrink-0 text-muted-foreground'}
        aria-hidden="true"
      />
      <span className={met ? 'text-foreground' : 'text-muted-foreground'}>
        <span className="sr-only">{met ? 'Cumplido: ' : 'Pendiente: '}</span>
        {children}
      </span>
    </li>
  );
}

export default function SecurityPage() {
  const { user, accessToken } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [succeeded, setSucceeded] = useState(false);
  const inFlightRef = useRef(false);
  const controllerRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      inFlightRef.current = false;
      controllerRef.current?.abort();
      controllerRef.current = null;
    };
  }, []);

  const strength = useMemo(
    () => calculatePasswordStrength(newPassword),
    [newPassword],
  );

  const passwordPolicy = useMemo(
    () => evaluatePasswordPolicy(newPassword),
    [newPassword],
  );
  const hasMinimumLength = passwordPolicy.hasMinimumLength;
  const hasMaximumLength = newPassword.length > 0
    && passwordPolicy.hasMaximumLength
    && passwordPolicy.hasValidEncoding;
  const passwordsMatch = confirmation.length > 0
    && newPassword === confirmation;
  const hasMixedCase = /[a-z]/.test(newPassword)
    && /[A-Z]/.test(newPassword);
  const hasNumber = /\d/.test(newPassword);
  const hasSymbol = /[^A-Za-z0-9]/.test(newPassword);
  const avoidsPersonalInfo = useMemo(
    () => passwordAvoidsPersonalInfo(
      newPassword,
      user?.displayName,
      user?.email,
    ),
    [
      newPassword,
      user?.displayName,
      user?.email,
    ],
  );

  const isValid = currentPassword.length > 0
    && passwordPolicy.isValid
    && passwordsMatch;

  async function submitPasswordChange(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!isValid || inFlightRef.current || accessToken === null) {
      return;
    }

    inFlightRef.current = true;
    setSubmitting(true);
    setError('');
    const controller = new AbortController();
    controllerRef.current = controller;

    try {
      await changePassword({
        currentPassword,
        newPassword: passwordPolicy.normalizedPassword,
      }, accessToken, controller.signal);
      if (!mountedRef.current) return;
      setCurrentPassword('');
      setNewPassword('');
      setConfirmation('');
      setSucceeded(true);
    } catch (requestError) {
      if (mountedRef.current
        && !(requestError instanceof DOMException && requestError.name === 'AbortError')) {
        setError(messageForPasswordChangeError(requestError));
      }
    } finally {
      inFlightRef.current = false;
      if (controllerRef.current === controller) controllerRef.current = null;
      if (mountedRef.current) setSubmitting(false);
    }
  }

  return (
    <section
      className="mx-auto w-full max-w-5xl py-2 sm:py-4"
      aria-labelledby="security-title"
    >
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
          Cuenta
        </p>
        <h1
          id="security-title"
          className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
        >
          Seguridad
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          Actualiza tu contraseña y protege el acceso a tu cuenta.
        </p>
      </header>

      <section
        className="mx-auto mt-7 max-w-3xl rounded-2xl border border-primary/20 bg-card p-5 shadow-sm sm:p-7 lg:p-8"
        aria-labelledby="change-password-title"
      >
        <header>
          <h2
            id="change-password-title"
            className="text-2xl font-bold tracking-tight text-foreground"
          >
            Cambiar contraseña
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Actualiza la contraseña que utilizas para acceder a CodeGym.
          </p>
        </header>

        {succeeded ? (
          <div className="mt-7 rounded-xl border border-success/30 bg-success/10 p-5" role="status">
            <h3 className="text-lg font-bold text-foreground">
              Contraseña actualizada
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Tu contraseña se ha cambiado correctamente.
            </p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Las demás sesiones activas de tu cuenta se han cerrado por seguridad.
            </p>
          </div>
        ) : <form
          className="mt-6 space-y-5"
          aria-label="Cambiar contraseña"
          noValidate
          onSubmit={(event) => { void submitPasswordChange(event); }}
        >
          <div>
            <PasswordField
              id="security-current-password"
              name="currentPassword"
              label="Contraseña actual"
              autoComplete="current-password"
              disabled={submitting}
              value={currentPassword}
              describedBy="current-password-recovery"
              onChange={(event) => {
                setCurrentPassword(event.target.value);
                setError('');
              }}
            />
            <Link
              id="current-password-recovery"
              to="/forgot-password"
              className="mt-2 inline-flex min-h-9 items-center rounded-md px-1 text-xs font-semibold text-primary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </div>

          <PasswordField
            id="security-new-password"
            name="newPassword"
            label="Nueva contraseña"
            autoComplete="new-password"
            disabled={submitting}
            value={newPassword}
            describedBy="security-password-strength security-password-guidance"
            onChange={(event) => {
              setNewPassword(event.target.value);
              setError('');
            }}
          />

          <PasswordField
            id="security-password-confirmation"
            name="passwordConfirmation"
            label="Confirmar nueva contraseña"
            autoComplete="new-password"
            disabled={submitting}
            value={confirmation}
            describedBy="security-password-guidance"
            invalid={confirmation.length > 0 && !passwordsMatch}
            onChange={(event) => {
              setConfirmation(event.target.value);
              setError('');
            }}
          />

          <div
            id="security-password-strength"
            role="progressbar"
            aria-label="Fortaleza de la nueva contraseña"
            aria-valuemin={0}
            aria-valuemax={4}
            aria-valuenow={strength}
            aria-valuetext={newPassword.length === 0
              ? 'Sin contraseña'
              : PASSWORD_STRENGTH_LABELS[strength]}
          >
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm font-semibold text-foreground">
                Fortaleza
              </p>
              <p className="text-xs font-medium text-muted-foreground">
                {newPassword.length === 0
                  ? 'Sin contraseña'
                  : PASSWORD_STRENGTH_LABELS[strength]}
              </p>
            </div>
            <div
              className="mt-2 grid grid-cols-4 gap-1.5"
              aria-hidden="true"
            >
              {[1, 2, 3, 4].map((level) => (
                <span
                  key={level}
                  className="h-1.5 rounded-full bg-border data-[active=true]:bg-primary"
                  data-active={strength >= level ? 'true' : 'false'}
                />
              ))}
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              La fortaleza es una orientación y no sustituye los requisitos obligatorios.
            </p>
          </div>

          <div
            id="security-password-guidance"
            className="grid gap-5 rounded-xl border border-border bg-background/35 p-4 sm:grid-cols-2 sm:p-5"
          >
            <section aria-labelledby="required-password-rules">
              <h3
                id="required-password-rules"
                className="text-xs font-bold uppercase tracking-[0.12em] text-foreground"
              >
                Requisitos obligatorios
              </h3>
              <ul className="mt-3 space-y-2.5">
                <RequirementItem met={hasMinimumLength}>
                  Al menos {PASSWORD_MINIMUM_CODE_POINTS} caracteres
                </RequirementItem>
                <RequirementItem met={hasMaximumLength}>
                  Máximo {PASSWORD_MAXIMUM_CODE_POINTS} caracteres
                </RequirementItem>
                <RequirementItem met={passwordsMatch}>
                  Las contraseñas coinciden
                </RequirementItem>
              </ul>
            </section>

            <section aria-labelledby="recommended-password-rules">
              <h3
                id="recommended-password-rules"
                className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground"
              >
                Recomendado
              </h3>
              <ul className="mt-3 space-y-2.5">
                <RequirementItem met={hasMixedCase}>
                  Combina mayúsculas y minúsculas
                </RequirementItem>
                <RequirementItem met={hasNumber}>
                  Incluye números
                </RequirementItem>
                <RequirementItem met={hasSymbol}>
                  Incluye símbolos
                </RequirementItem>
                <RequirementItem met={avoidsPersonalInfo}>
                  Evita información personal
                </RequirementItem>
              </ul>
            </section>
          </div>

          {error ? (
            <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 text-sm text-red-300" role="alert">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            className="inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-primary/60 bg-primary px-5 text-sm font-bold text-primary-foreground shadow-sm shadow-primary/15 transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!isValid || submitting}
          >
            {submitting ? 'Cambiando contraseña…' : 'Cambiar contraseña'}
          </button>

          <p className="flex items-start gap-2.5 rounded-xl border border-primary/15 bg-primary/[0.05] p-3.5 text-xs leading-relaxed text-muted-foreground">
            <Info
              className="mt-0.5 size-4 shrink-0 text-primary"
              aria-hidden="true"
            />
            <span>
              Por seguridad, al cambiar tu contraseña se cerrarán las demás sesiones de tu cuenta.
            </span>
          </p>
        </form>}
      </section>
    </section>
  );
}

function messageForPasswordChangeError(error: unknown): string {
  if (error instanceof ApiError && error.code === 'INVALID_CURRENT_PASSWORD') {
    return 'La contraseña actual no es correcta.';
  }
  if (error instanceof ApiError && error.code === 'NEW_PASSWORD_SAME_AS_CURRENT') {
    return 'La nueva contraseña debe ser diferente de la actual.';
  }
  if (error instanceof ApiError && error.status === 429) {
    return 'Has realizado demasiados intentos. Espera un poco antes de volver a intentarlo.';
  }
  return 'No se pudo cambiar la contraseña. Inténtalo de nuevo.';
}

function passwordAvoidsPersonalInfo(
  password: string,
  displayName: string | null | undefined,
  email: string | null | undefined,
): boolean {
  if (password.length === 0) {
    return false;
  }

  const normalizedPassword = password.toLocaleLowerCase('es');
  const personalTokens = [
    ...(displayName?.split(/\s+/) ?? []),
    email?.split('@')[0] ?? '',
  ]
    .map((token) => token.trim().toLocaleLowerCase('es'))
    .filter((token) => token.length >= 3);

  return personalTokens.every((token) => !normalizedPassword.includes(token));
}
