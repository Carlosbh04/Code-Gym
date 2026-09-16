import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  Mail,
  UserRound,
} from 'lucide-react';

import { GoogleAuthButton } from './GoogleAuthButton';
import { AuthSeparator } from './LoginForm';
import { PasswordField } from './PasswordField';
import {
  calculatePasswordStrength,
  PASSWORD_STRENGTH_LABELS,
} from './password-strength';
import {
  buildDisplayName,
  EMPTY_REGISTER_VALUES,
  validateAccountDetails,
  validateConfirmation,
  validatePersonalDetails,
  type RegisterErrors,
  type RegisterField,
  type RegisterFormValues,
  type RegisterStep,
} from './register-form-model';
import { RegisterStepper } from './RegisterStepper';
import type { RegisterInput } from './auth-api';

interface RegisterFormProps {
  onSubmit(input: RegisterInput): void;
  onGoogle(
    credential: string,
  ): void;
  onGoogleError?(
    error: Error,
  ): void;
  onChangeMode(): void;
  isSubmitting?: boolean;
}

interface StepSectionProps {
  step: RegisterStep;
  title: string;
  description: string;
  currentStep: RegisterStep;
  highestStep: RegisterStep;
  headerRef: (element: HTMLButtonElement | null) => void;
  onSelect: (step: RegisterStep) => void;
  children: ReactNode;
}

function StepSection({
  step,
  title,
  description,
  currentStep,
  highestStep,
  headerRef,
  onSelect,
  children,
}: StepSectionProps) {
  const expanded = currentStep === step;
  const complete = step < currentStep || (step < highestStep && !expanded);
  const pending = step > highestStep;
  const state = expanded ? 'current' : complete ? 'complete' : 'pending';
  const panelId = `register-step-${step}-panel`;

  return (
    <section className="auth-register-section" data-state={state}>
      <button
        ref={headerRef}
        type="button"
        className="auth-register-section-header"
        aria-expanded={expanded}
        aria-controls={panelId}
        disabled={pending}
        onClick={() => onSelect(step)}
      >
        <span className="auth-register-section-badge" aria-hidden="true">
          {complete ? <Check className="size-4" /> : step}
        </span>
        <span className="auth-register-section-copy">
          <span>{title}</span>
          <span>{description}</span>
        </span>
        <ChevronDown className="ml-auto size-4" aria-hidden="true" />
      </button>

      {expanded ? (
        <div id={panelId} className="auth-register-section-body">
          {children}
        </div>
      ) : null}
    </section>
  );
}

function FieldError({ id, children }: { id: string; children?: string }) {
  if (!children) {
    return null;
  }

  return (
    <p id={id} className="mt-1.5 text-xs text-code-error" role="alert">
      {children}
    </p>
  );
}

export function RegisterForm({
  onSubmit,
  onGoogle,
  onGoogleError,
  onChangeMode,
  isSubmitting = false,
}: RegisterFormProps) {
  const [currentStep, setCurrentStep] = useState<RegisterStep>(1);
  const [highestStep, setHighestStep] = useState<RegisterStep>(1);
  const [values, setValues] = useState<RegisterFormValues>(EMPTY_REGISTER_VALUES);
  const [errors, setErrors] = useState<RegisterErrors>({});
  const stepHeaderRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const submissionStartedRef = useRef(false);

  useEffect(() => {
    if (!isSubmitting) {
      submissionStartedRef.current = false;
    }
  }, [isSubmitting]);

  const strength = useMemo(
    () => calculatePasswordStrength(values.password),
    [values.password],
  );

  const updateValue = <Field extends RegisterField>(
    field: Field,
    value: RegisterFormValues[Field],
  ) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));

    if (currentStep < highestStep) {
      setHighestStep(currentStep);
    }
  };

  const moveToStep = (step: RegisterStep) => {
    setCurrentStep(step);
    requestAnimationFrame(() => stepHeaderRefs.current[step - 1]?.focus());
  };

  const advance = () => {
    const nextErrors = currentStep === 1
      ? validatePersonalDetails(values)
      : validateAccountDetails(values);

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    const nextStep = (currentStep + 1) as RegisterStep;
    setHighestStep((current) => Math.max(current, nextStep) as RegisterStep);
    moveToStep(nextStep);
  };

  const finishRegistration = () => {
    const personalErrors = validatePersonalDetails(values);
    const accountErrors = validateAccountDetails(values);
    const confirmationErrors = validateConfirmation(values);
    const nextErrors = {
      ...personalErrors,
      ...accountErrors,
      ...confirmationErrors,
    };
    setErrors(nextErrors);

    if (Object.keys(personalErrors).length > 0) {
      setHighestStep(1);
      moveToStep(1);
      return;
    }

    if (Object.keys(accountErrors).length > 0) {
      setHighestStep(2);
      moveToStep(2);
      return;
    }

    if (Object.keys(confirmationErrors).length > 0) {
      return;
    }

    if (isSubmitting || submissionStartedRef.current) {
      return;
    }

    submissionStartedRef.current = true;
    onSubmit({
      email: values.email.trim(),
      password: values.password,
      displayName: buildDisplayName(values),
    });
  };

  const selectStep = (step: RegisterStep) => {
    if (step <= highestStep) {
      moveToStep(step);
    }
  };

  return (
    <form
      className="auth-mode-wave space-y-4"
      aria-label="Crear cuenta"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();

        if (currentStep < 3) {
          advance();
        } else {
          finishRegistration();
        }
      }}
    >
      <RegisterStepper currentStep={currentStep} />
      <p className="sr-only" aria-live="polite">Paso {currentStep} de 3</p>

      <div className="space-y-2.5">
        <StepSection
          step={1}
          title="Datos personales"
          description="Cuéntanos un poco sobre ti."
          currentStep={currentStep}
          highestStep={highestStep}
          headerRef={(element) => { stepHeaderRefs.current[0] = element; }}
          onSelect={selectStep}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="register-first-name" className="auth-field-label">
                Nombre
              </label>
              <div className="auth-input-shell">
                <UserRound className="auth-input-icon" aria-hidden="true" />
                <input
                  id="register-first-name"
                  name="firstName"
                  type="text"
                  autoComplete="given-name"
                  className="auth-input"
                  placeholder="Tu nombre"
                  value={values.firstName}
                  disabled={isSubmitting}
                  aria-invalid={Boolean(errors.firstName) || undefined}
                  aria-describedby={errors.firstName ? 'register-first-name-error' : undefined}
                  onChange={(event) => updateValue('firstName', event.target.value)}
                />
              </div>
              <FieldError id="register-first-name-error">{errors.firstName}</FieldError>
            </div>

            <div>
              <label htmlFor="register-last-name" className="auth-field-label">
                Apellido
              </label>
              <div className="auth-input-shell">
                <UserRound className="auth-input-icon" aria-hidden="true" />
                <input
                  id="register-last-name"
                  name="lastName"
                  type="text"
                  autoComplete="family-name"
                  className="auth-input"
                  placeholder="Tu apellido"
                  value={values.lastName}
                  disabled={isSubmitting}
                  aria-invalid={Boolean(errors.lastName) || undefined}
                  aria-describedby={errors.lastName ? 'register-last-name-error' : undefined}
                  onChange={(event) => updateValue('lastName', event.target.value)}
                />
              </div>
              <FieldError id="register-last-name-error">{errors.lastName}</FieldError>
            </div>
          </div>

          <div>
            <label htmlFor="register-preferred-name" className="auth-field-label">
              ¿Cómo te gustaría que te llamemos? <span className="font-normal text-code-muted">(opcional)</span>
            </label>
            <div className="auth-input-shell">
              <UserRound className="auth-input-icon" aria-hidden="true" />
              <input
                id="register-preferred-name"
                name="preferredName"
                type="text"
                autoComplete="nickname"
                className="auth-input"
                placeholder="juanperez o juan.dev"
                value={values.preferredName}
                disabled={isSubmitting}
                onChange={(event) => updateValue('preferredName', event.target.value)}
              />
            </div>
          </div>

          <button type="submit" className="auth-primary-button" disabled={isSubmitting}>
            Siguiente
            <ArrowRight className="size-4" aria-hidden="true" />
          </button>
        </StepSection>

        <StepSection
          step={2}
          title="Cuenta"
          description="Email, contraseña y seguridad."
          currentStep={currentStep}
          highestStep={highestStep}
          headerRef={(element) => { stepHeaderRefs.current[1] = element; }}
          onSelect={selectStep}
        >
          <div>
            <label htmlFor="register-email" className="auth-field-label">Email</label>
            <div className="auth-input-shell">
              <Mail className="auth-input-icon" aria-hidden="true" />
              <input
                id="register-email"
                name="email"
                type="email"
                autoComplete="email"
                className="auth-input"
                placeholder="tu@email.com"
                value={values.email}
                disabled={isSubmitting}
                aria-invalid={Boolean(errors.email) || undefined}
                aria-describedby={errors.email ? 'register-email-error' : undefined}
                onChange={(event) => updateValue('email', event.target.value)}
              />
            </div>
            <FieldError id="register-email-error">{errors.email}</FieldError>
          </div>

          <div>
            <PasswordField
              id="register-password"
              name="password"
              label="Contraseña"
              autoComplete="new-password"
              minLength={8}
              value={values.password}
              disabled={isSubmitting}
              invalid={Boolean(errors.password)}
              describedBy={errors.password ? 'register-password-error password-strength' : 'password-strength'}
              onChange={(event) => updateValue('password', event.target.value)}
            />
            <FieldError id="register-password-error">{errors.password}</FieldError>

            <div
              id="password-strength"
              className="mt-2"
              role="progressbar"
              aria-label="Fortaleza de la contraseña"
              aria-valuemin={0}
              aria-valuemax={4}
              aria-valuenow={strength}
              aria-valuetext={values.password.length === 0
                ? 'Sin contraseña'
                : PASSWORD_STRENGTH_LABELS[strength]}
            >
              <div className="grid grid-cols-4 gap-1.5" aria-hidden="true">
                {[1, 2, 3, 4].map((level) => (
                  <span
                    key={level}
                    className="h-1 rounded-full bg-code-border data-[active=true]:bg-code-accent"
                    data-active={strength >= level ? 'true' : 'false'}
                  />
                ))}
              </div>
              <p className="mt-1.5 text-xs text-code-muted">
                {values.password.length === 0
                  ? 'Usa 8 caracteres, mayúsculas, números y símbolos.'
                  : PASSWORD_STRENGTH_LABELS[strength]}
              </p>
            </div>
          </div>

          <div>
            <PasswordField
              id="register-password-confirmation"
              name="passwordConfirmation"
              label="Confirmar contraseña"
              autoComplete="new-password"
              value={values.confirmation}
              disabled={isSubmitting}
              invalid={Boolean(errors.confirmation)}
              describedBy={errors.confirmation ? 'register-confirmation-error' : undefined}
              onChange={(event) => updateValue('confirmation', event.target.value)}
            />
            <FieldError id="register-confirmation-error">{errors.confirmation}</FieldError>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              className="auth-secondary-button"
              disabled={isSubmitting}
              onClick={() => moveToStep(1)}
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              Atrás
            </button>
            <button type="submit" className="auth-primary-button" disabled={isSubmitting}>
              Siguiente
              <ArrowRight className="size-4" aria-hidden="true" />
            </button>
          </div>
        </StepSection>

        <StepSection
          step={3}
          title="Confirmación"
          description="Revisa tus datos y crea tu cuenta."
          currentStep={currentStep}
          highestStep={highestStep}
          headerRef={(element) => { stepHeaderRefs.current[2] = element; }}
          onSelect={selectStep}
        >
          <dl className="auth-register-summary" aria-label="Resumen de la cuenta">
            <div>
              <dt>Nombre</dt>
              <dd>{`${values.firstName.trim()} ${values.lastName.trim()}`.trim()}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{values.email.trim()}</dd>
            </div>
            <div>
              <dt>Nombre visible</dt>
              <dd>{buildDisplayName(values)}</dd>
            </div>
          </dl>

          <div>
            <label className="flex cursor-pointer items-start gap-3 text-sm leading-5 text-code-muted">
              <input
                type="checkbox"
                required
                className="mt-0.5 size-4 shrink-0 rounded border-code-border accent-code-accent"
                checked={values.acceptedTerms}
                disabled={isSubmitting}
                aria-invalid={Boolean(errors.acceptedTerms) || undefined}
                aria-describedby={errors.acceptedTerms ? 'register-terms-error' : undefined}
                onChange={(event) => updateValue('acceptedTerms', event.target.checked)}
              />
              <span>Acepto los términos de uso y la política de privacidad.</span>
            </label>
            <FieldError id="register-terms-error">{errors.acceptedTerms}</FieldError>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              className="auth-secondary-button"
              disabled={isSubmitting}
              onClick={() => moveToStep(2)}
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              Atrás
            </button>
            <button type="submit" className="auth-primary-button" disabled={isSubmitting}>
              Crear cuenta
              <ArrowRight className="size-4" aria-hidden="true" />
            </button>
          </div>
        </StepSection>
      </div>

      <AuthSeparator />
      <GoogleAuthButton
        label="Registrarme con Google"
        onCredential={onGoogle}
        onError={onGoogleError}
        disabled={isSubmitting}
      />

      <p className="text-center text-sm text-code-muted">
        ¿Ya tienes una cuenta?{' '}
        <button
          type="button"
          className="font-semibold text-code-accent hover:text-code-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-code-accent"
          onClick={onChangeMode}
          disabled={isSubmitting}
        >
          Iniciar sesión
        </button>
      </p>
    </form>
  );
}
