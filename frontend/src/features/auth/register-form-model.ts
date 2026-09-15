import { evaluatePasswordPolicy } from './password-policy';

export type RegisterStep = 1 | 2 | 3;

export interface RegisterFormValues {
  firstName: string;
  lastName: string;
  preferredName: string;
  email: string;
  password: string;
  confirmation: string;
  acceptedTerms: boolean;
}

export type RegisterField = keyof RegisterFormValues;
export type RegisterErrors = Partial<Record<RegisterField, string>>;

export const EMPTY_REGISTER_VALUES: RegisterFormValues = {
  firstName: '',
  lastName: '',
  preferredName: '',
  email: '',
  password: '',
  confirmation: '',
  acceptedTerms: false,
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validatePersonalDetails(
  values: RegisterFormValues,
): RegisterErrors {
  const errors: RegisterErrors = {};

  if (!values.firstName.trim()) {
    errors.firstName = 'Introduce tu nombre.';
  }

  if (!values.lastName.trim()) {
    errors.lastName = 'Introduce tus apellidos.';
  }

  return errors;
}

export function validateAccountDetails(
  values: RegisterFormValues,
): RegisterErrors {
  const errors: RegisterErrors = {};
  const email = values.email.trim();

  if (!email) {
    errors.email = 'Introduce tu email.';
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.email = 'Introduce un email válido.';
  }

  const passwordPolicy = evaluatePasswordPolicy(values.password);
  if (!passwordPolicy.hasMinimumLength) {
    errors.password = 'La contraseña debe tener al menos 15 caracteres.';
  } else if (!passwordPolicy.hasMaximumLength || !passwordPolicy.hasValidEncoding) {
    errors.password = 'La contraseña no puede superar 128 caracteres ni 512 bytes.';
  }

  if (!values.confirmation) {
    errors.confirmation = 'Confirma tu contraseña.';
  } else if (values.password !== values.confirmation) {
    errors.confirmation = 'Las contraseñas no coinciden.';
  }

  return errors;
}

export function validateConfirmation(
  values: RegisterFormValues,
): RegisterErrors {
  return values.acceptedTerms
    ? {}
    : { acceptedTerms: 'Debes aceptar los términos para crear tu cuenta.' };
}

export function buildDisplayName(values: RegisterFormValues): string {
  const preferredName = values.preferredName.trim();

  if (preferredName) {
    return preferredName;
  }

  return `${values.firstName.trim()} ${values.lastName.trim()}`.trim();
}
