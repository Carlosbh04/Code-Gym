import {
  argon2id,
  hash as argonHash,
  needsRehash as argonNeedsRehash,
  verify as argonVerify,
} from 'argon2';

import { isPasswordSafeToVerify, normalizePassword, validatePassword } from './password-policy.js';

export const argon2idParameters = Object.freeze({
  type: argon2id,
  version: 0x13,
  memoryCost: 65_536,
  timeCost: 3,
  parallelism: 1,
  hashLength: 32,
});

export async function hashPassword(password: string): Promise<string> {
  return argonHash(validatePassword(password), argon2idParameters);
}

export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  if (!isArgon2idHash(passwordHash) || !isPasswordSafeToVerify(password)) {
    return false;
  }

  try {
    return await argonVerify(passwordHash, normalizePassword(password));
  } catch {
    return false;
  }
}

/** Invalid or non-Argon2id hashes always require replacement. */
export function needsRehash(passwordHash: string): boolean {
  if (!isArgon2idHash(passwordHash) || encodedHashLength(passwordHash) !== argon2idParameters.hashLength) {
    return true;
  }

  try {
    return argonNeedsRehash(passwordHash, argon2idParameters);
  } catch {
    return true;
  }
}

function isArgon2idHash(value: string): boolean {
  return value.startsWith('$argon2id$v=19$');
}

function encodedHashLength(value: string): number | undefined {
  const encodedHash = value.split('$')[5];
  if (encodedHash === undefined || !/^[A-Za-z0-9+/]+$/.test(encodedHash)) {
    return undefined;
  }

  return Buffer.from(encodedHash, 'base64').byteLength;
}
