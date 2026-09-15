import { Check } from 'lucide-react';

const PASSWORD_RESET_STEPS = [
  'Correo',
  'Código',
  'Nueva contraseña',
] as const;

export type PasswordResetStep = 1 | 2 | 3;

interface PasswordResetStepperProps {
  activeStep: PasswordResetStep;
  complete?: boolean;
  emailLabel?: 'Correo' | 'Email';
}

export function PasswordResetStepper({
  activeStep,
  complete = false,
  emailLabel = 'Correo',
}: PasswordResetStepperProps) {
  return (
    <ol
      className="password-reset-stepper"
      aria-label="Progreso de recuperación de contraseña"
    >
      {PASSWORD_RESET_STEPS.map((label, index) => {
        const step = (index + 1) as PasswordResetStep;
        const visibleLabel = step === 1 ? emailLabel : label;
        const state = complete || step < activeStep
          ? 'complete'
          : step === activeStep ? 'current' : 'pending';

        return (
          <li
            key={label}
            className="password-reset-stepper__item"
            data-state={state}
            aria-current={state === 'current' ? 'step' : undefined}
            aria-label={`Paso ${step}: ${visibleLabel}`}
          >
            <span
              className="password-reset-stepper__number"
              aria-hidden="true"
            >
              {state === 'complete' ? <Check className="size-4" /> : step}
            </span>

            <span className="password-reset-stepper__label">
              {step}. {visibleLabel}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
