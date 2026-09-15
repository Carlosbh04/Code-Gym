export const passwordPolicy = Object.freeze({
  minimumCodePoints: 15,
  maximumCodePoints: 128,
  maximumUtf8Bytes: 512,
  normalization: 'NFC' as const,
});

export class PasswordPolicyError extends Error {
  public constructor() {
    super('Password does not meet the password policy');
    this.name = 'PasswordPolicyError';
  }
}

/**
 * Normalizes a password without trimming or otherwise altering intentional
 * whitespace. Registration code must use the returned value for hashing.
 */
export function validatePassword(password: string): string {
  const normalizedPassword = normalizePassword(password);
  const codePointLength = countCodePoints(normalizedPassword);
  const byteLength = Buffer.byteLength(normalizedPassword, 'utf8');

  if (
    codePointLength < passwordPolicy.minimumCodePoints
    || codePointLength > passwordPolicy.maximumCodePoints
    || byteLength > passwordPolicy.maximumUtf8Bytes
  ) {
    throw new PasswordPolicyError();
  }

  return normalizedPassword;
}

/** NFC normalization is the only transformation applied to passwords. */
export function normalizePassword(password: string): string {
  if (!isWellFormedUnicode(password)) {
    throw new PasswordPolicyError();
  }

  return password.normalize(passwordPolicy.normalization);
}

/** Bounds verification input before invoking the intentionally expensive KDF. */
export function isPasswordSafeToVerify(password: string): boolean {
  try {
    const normalizedPassword = normalizePassword(password);
    return (
      countCodePoints(normalizedPassword) <= passwordPolicy.maximumCodePoints
      && Buffer.byteLength(normalizedPassword, 'utf8') <= passwordPolicy.maximumUtf8Bytes
    );
  } catch {
    return false;
  }
}

function countCodePoints(value: string): number {
  return Array.from(value).length;
}

function isWellFormedUnicode(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const codeUnit = value.charCodeAt(index);
    if (codeUnit >= 0xd800 && codeUnit <= 0xdbff) {
      if (index + 1 >= value.length) {
        return false;
      }
      const following = value.charCodeAt(index + 1);
      if (following < 0xdc00 || following > 0xdfff) {
        return false;
      }
      index += 1;
      continue;
    }

    if (codeUnit >= 0xdc00 && codeUnit <= 0xdfff) {
      return false;
    }
  }

  return true;
}
