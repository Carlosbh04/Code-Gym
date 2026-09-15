import { describe, expect, it } from 'vitest';
import { calculatePasswordStrength } from './password-strength';

describe('calculatePasswordStrength', () => {
  it('deriva la fortaleza de señales reales de la contraseña', () => {
    expect(calculatePasswordStrength('')).toBe(0);
    expect(calculatePasswordStrength('abc')).toBe(0);
    expect(calculatePasswordStrength('abcdefgh')).toBe(0);
    expect(calculatePasswordStrength('Abcdefgh1!')).toBe(3);
    expect(calculatePasswordStrength('Abcdefgh12345!X')).toBe(4);
  });
});
