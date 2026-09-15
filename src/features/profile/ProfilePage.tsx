import {
  CalendarDays,
  Mail,
  ShieldCheck,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from 'react';

import { useAuth } from '@/features/auth/AuthContext';
import { ApiError } from '@/lib/api/http-client';

interface AccountDetailProps {
  readonly label: string;
  readonly value: string;
  readonly icon: LucideIcon;
}

function ProfilePage() {
  const {
    user,
    updateProfile,
  } = useAuth();
  const [
    isEditing,
    setIsEditing,
  ] = useState(false);
  const [
    draftName,
    setDraftName,
  ] = useState('');
  const [
    error,
    setError,
  ] = useState('');
  const [
    isSaving,
    setIsSaving,
  ] = useState(false);
  const inputRef =
    useRef<HTMLInputElement>(null);
  const submitPendingRef =
    useRef(false);

  useEffect(
    () => {
      if (isEditing) {
        inputRef.current?.focus();
      }
    },
    [
      isEditing,
    ],
  );

  if (user === null) {
    return (
      <section aria-labelledby="profile-title" className="mx-auto w-full max-w-5xl py-2 sm:py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Cuenta</p>
        <h1 id="profile-title" className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Mi perfil
        </h1>
        <p role="status" className="mt-5 rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
          No pudimos cargar la información de tu cuenta.
        </p>
      </section>
    );
  }

  const email = user.email.trim();
  const persistedDisplayName =
    user.displayName;
  const displayName = user.displayName?.trim() || email;
  const initial = (displayName || email).slice(0, 1).toLocaleUpperCase('es');
  const createdAt = formatAccountDate(user.createdAt);

  function startEditing() {
    setDraftName(
      persistedDisplayName ?? '',
    );
    setError('');
    setIsEditing(true);
  }

  function cancelEditing() {
    if (submitPendingRef.current) return;

    setDraftName(
      persistedDisplayName ?? '',
    );
    setError('');
    setIsEditing(false);
  }

  async function saveProfile(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (submitPendingRef.current) return;

    const normalizedName =
      draftName.trim();

    if (normalizedName.length === 0) {
      setError(
        'El nombre visible no puede estar vacío.',
      );
      return;
    }

    if (normalizedName.length > 100) {
      setError(
        'El nombre visible no puede superar los 100 caracteres.',
      );
      return;
    }

    submitPendingRef.current = true;
    setIsSaving(true);
    setError('');

    try {
      await updateProfile({
        displayName:
          normalizedName,
      });
      setIsEditing(false);
    } catch (caughtError) {
      setError(
        profileErrorMessage(
          caughtError,
        ),
      );
    } finally {
      submitPendingRef.current = false;
      setIsSaving(false);
    }
  }

  return (
    <section aria-labelledby="profile-title" className="mx-auto w-full max-w-5xl py-2 sm:py-4">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Cuenta</p>
        <h1 id="profile-title" className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Mi perfil
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          Consulta la identidad y los datos asociados a tu cuenta de CodeGym.
        </p>
      </header>

      <section
        aria-labelledby="profile-summary-title"
        className="mt-6 rounded-2xl border border-primary/20 bg-card p-5 shadow-sm sm:p-7"
      >
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <span
            data-testid="profile-avatar"
            aria-hidden="true"
            className="flex size-20 shrink-0 items-center justify-center rounded-full border border-primary/40 bg-primary text-2xl font-bold text-primary-foreground shadow-sm shadow-primary/20 sm:size-24 sm:text-3xl"
          >
            {initial}
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h2 id="profile-summary-title" className="min-w-0 break-words text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {displayName}
              </h2>
              <span className="inline-flex min-h-7 items-center rounded-full border border-primary/25 bg-primary/10 px-2.5 text-xs font-semibold tracking-wide text-primary">
                {user.role}
              </span>
            </div>
            <p className="mt-2 break-all text-sm text-muted-foreground sm:text-base">
              {email}
            </p>
          </div>
        </div>
      </section>

      <section aria-labelledby="account-details-title" className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Información</p>
            <h2 id="account-details-title" className="mt-1.5 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              Información de cuenta
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              El nombre visible puede actualizarse; el resto de datos permanece en modo lectura.
            </p>
          </div>

          {!isEditing ? (
            <button
              type="button"
              className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 px-4 text-sm font-semibold text-primary transition-colors hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
              onClick={startEditing}
            >
              Editar perfil
            </button>
          ) : null}
        </div>

        {isEditing ? (
          <form
            className="mt-5 rounded-xl border border-primary/25 bg-primary/[0.04] p-4 sm:p-5"
            noValidate
            onSubmit={(event) => void saveProfile(event)}
          >
            <div className="max-w-xl">
              <label
                htmlFor="profile-display-name"
                className="text-sm font-semibold text-foreground"
              >
                Nombre visible
              </label>
              <input
                ref={inputRef}
                id="profile-display-name"
                name="displayName"
                type="text"
                autoComplete="name"
                aria-describedby={error === '' ? 'profile-name-help' : 'profile-name-help profile-name-error'}
                aria-invalid={error !== ''}
                value={draftName}
                className="mt-2 min-h-11 w-full rounded-xl border border-input bg-background px-3.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/25 disabled:cursor-wait disabled:opacity-70"
                disabled={isSaving}
                onChange={(event) => {
                  setDraftName(event.target.value);
                  if (error !== '') setError('');
                }}
              />
              <p id="profile-name-help" className="mt-2 text-xs text-muted-foreground">
                Entre 1 y 100 caracteres.
              </p>
              {error !== '' ? (
                <p id="profile-name-error" role="alert" className="mt-2 text-sm font-medium text-destructive">
                  {error}
                </p>
              ) : null}
            </div>

            <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border px-4 text-sm font-semibold text-foreground transition-colors hover:bg-muted/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-wait disabled:opacity-60"
                disabled={isSaving}
                onClick={cancelEditing}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card disabled:cursor-wait disabled:opacity-70"
                disabled={isSaving}
              >
                {isSaving ? 'Guardando…' : 'Guardar cambios'}
              </button>
            </div>
          </form>
        ) : null}

        <dl className="mt-5 grid gap-3 sm:grid-cols-2">
          <AccountDetail icon={UserRound} label="Nombre visible" value={displayName} />
          <AccountDetail icon={Mail} label="Email" value={email} />
          <AccountDetail icon={ShieldCheck} label="Rol" value={user.role} />
          <AccountDetail icon={CalendarDays} label="Cuenta creada" value={createdAt} />
        </dl>
      </section>
    </section>
  );
}

function profileErrorMessage(
  error: unknown,
): string {
  if (error instanceof ApiError) {
    if (error.status === 400) {
      return 'Revisa el nombre visible e inténtalo de nuevo.';
    }

    if (error.status === 401) {
      return 'Tu sesión ya no es válida. Inicia sesión de nuevo.';
    }
  }

  return 'No pudimos guardar el nombre. Inténtalo de nuevo.';
}

function AccountDetail({ label, value, icon: Icon }: AccountDetailProps) {
  return (
    <div className="flex min-w-0 gap-3 rounded-xl border border-border bg-background/35 p-4">
      <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon className="size-5" />
      </span>
      <div className="min-w-0">
        <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
        <dd className="mt-1 break-words text-sm font-semibold text-foreground sm:text-base">{value}</dd>
      </div>
    </div>
  );
}

function formatAccountDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return 'Fecha no disponible';

  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

export default ProfilePage;
