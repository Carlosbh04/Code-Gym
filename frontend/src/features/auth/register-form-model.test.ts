import { describe, expect, it } from 'vitest';

import {
  buildDisplayName,
  EMPTY_REGISTER_VALUES,
  validateAccountDetails,
  validateConfirmation,
  validatePersonalDetails,
} from './register-form-model';

describe('register form model', () => {
  it('requires first name and last name in the personal step', () => {
    expect(validatePersonalDetails(EMPTY_REGISTER_VALUES)).toEqual({
      firstName: 'Introduce tu nombre.',
      lastName: 'Introduce tus apellidos.',
    });
  });

  it('validates email, minimum password length and confirmation', () => {
    expect(validateAccountDetails({
      ...EMPTY_REGISTER_VALUES,
      email: 'invalid',
      password: 'short',
      confirmation: 'different',
    })).toEqual({
      email: 'Introduce un email válido.',
      password: 'La contraseña debe tener al menos 15 caracteres.',
      confirmation: 'Las contraseñas no coinciden.',
    });
  });

  it('requires terms only in the final confirmation', () => {
    expect(validateConfirmation(EMPTY_REGISTER_VALUES)).toEqual({
      acceptedTerms: 'Debes aceptar los términos para crear tu cuenta.',
    });
    expect(validateConfirmation({ ...EMPTY_REGISTER_VALUES, acceptedTerms: true })).toEqual({});
  });

  it('uses the preferred name when present and otherwise the full name', () => {
    expect(buildDisplayName({
      ...EMPTY_REGISTER_VALUES,
      firstName: ' Carlos ',
      lastName: ' Benítez ',
      preferredName: ' Charlie ',
    })).toBe('Charlie');

    expect(buildDisplayName({
      ...EMPTY_REGISTER_VALUES,
      firstName: ' Carlos ',
      lastName: ' Benítez ',
    })).toBe('Carlos Benítez');
  });
});
