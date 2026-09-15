import { describe, expect, it } from 'vitest';

import { evaluatePasswordPolicy } from './password-policy';

describe('password policy shared with password reset', () => {
  it('uses code points, NFC normalization, and the backend bounds', () => {
    expect(evaluatePasswordPolicy('a'.repeat(14)).isValid).toBe(false);
    expect(evaluatePasswordPolicy('a'.repeat(15)).isValid).toBe(true);
    expect(evaluatePasswordPolicy('a'.repeat(128)).isValid).toBe(true);
    expect(evaluatePasswordPolicy('a'.repeat(129)).isValid).toBe(false);
    expect(evaluatePasswordPolicy('e\u0301'.repeat(15)).normalizedPassword).toBe('é'.repeat(15));
  });

  it('rejects malformed Unicode and passwords over 512 UTF-8 bytes', () => {
    expect(evaluatePasswordPolicy('\ud800'.repeat(15)).isValid).toBe(false);
    expect(evaluatePasswordPolicy('😀'.repeat(128)).isValid).toBe(true);
    expect(evaluatePasswordPolicy('😀'.repeat(129)).isValid).toBe(false);
  });
});
