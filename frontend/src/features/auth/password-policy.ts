export const PASSWORD_MINIMUM_CODE_POINTS = 15;
export const PASSWORD_MAXIMUM_CODE_POINTS = 128;
export const PASSWORD_MAXIMUM_UTF8_BYTES = 512;

export interface PasswordPolicyResult {
  readonly normalizedPassword: string;
  readonly hasMinimumLength: boolean;
  readonly hasMaximumLength: boolean;
  readonly hasValidEncoding: boolean;
  readonly isValid: boolean;
}

export function evaluatePasswordPolicy(password: string): PasswordPolicyResult {
  const hasValidEncoding = isWellFormedUnicode(password);
  const normalizedPassword = hasValidEncoding ? password.normalize('NFC') : password;
  const codePointLength = Array.from(normalizedPassword).length;
  const utf8Bytes = new TextEncoder().encode(normalizedPassword).byteLength;
  const hasMinimumLength = codePointLength >= PASSWORD_MINIMUM_CODE_POINTS;
  const hasMaximumLength = codePointLength <= PASSWORD_MAXIMUM_CODE_POINTS
    && utf8Bytes <= PASSWORD_MAXIMUM_UTF8_BYTES;

  return {
    normalizedPassword,
    hasMinimumLength,
    hasMaximumLength,
    hasValidEncoding,
    isValid: hasValidEncoding && hasMinimumLength && hasMaximumLength,
  };
}

function isWellFormedUnicode(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const codeUnit = value.charCodeAt(index);
    if (codeUnit >= 0xd800 && codeUnit <= 0xdbff) {
      const following = value.charCodeAt(index + 1);
      if (following < 0xdc00 || following > 0xdfff) return false;
      index += 1;
    } else if (codeUnit >= 0xdc00 && codeUnit <= 0xdfff) {
      return false;
    }
  }
  return true;
}
