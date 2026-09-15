import { Check } from 'lucide-react';

import type { RegisterStep } from './register-form-model';

const STEPS = [
  { number: 1, label: 'Datos personales' },
  { number: 2, label: 'Cuenta' },
  { number: 3, label: 'Confirmación' },
] as const;

interface RegisterStepperProps {
  currentStep: RegisterStep;
}

export function RegisterStepper({ currentStep }: RegisterStepperProps) {
  return (
    <ol className="auth-register-progress" aria-label="Progreso del registro">
      {STEPS.map((step) => {
        const state = step.number < currentStep
          ? 'complete'
          : step.number === currentStep
            ? 'current'
            : 'pending';

        return (
          <li
            key={step.number}
            className="auth-register-progress-item"
            data-state={state}
            aria-current={state === 'current' ? 'step' : undefined}
          >
            <span className="auth-register-progress-number" aria-hidden="true">
              {state === 'complete'
                ? <Check className="size-3.5" />
                : step.number}
            </span>
            <span className="auth-register-progress-label">{step.label}</span>
          </li>
        );
      })}
    </ol>
  );
}
