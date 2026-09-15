import { describe, expect, it } from 'vitest';

import { passwordPolicy } from '../src/auth/password-policy.js';
import { normalizeEmail, registerRequestSchema } from '../src/auth/register-schema.js';

const validPassword = 'correct horse battery staple';

function validEmailAtMaximumLength(): string {
  return `${'a'.repeat(64)}@${'b'.repeat(63)}.${'c'.repeat(63)}.${'d'.repeat(61)}`;
}

describe('register request schema', () => {
  it('accepts the public register fields and canonicalizes email consistently', () => {
    const result = registerRequestSchema.parse({
      email: '  Person.Name+Label@EXAMPLE.COM  ',
      password: validPassword,
      displayName: '  Ada Lovelace  ',
    });

    expect(result).toEqual({
      email: 'person.name+label@example.com',
      password: validPassword,
      displayName: 'Ada Lovelace',
    });
    expect(normalizeEmail('  Person.Name+Label@EXAMPLE.COM  ')).toBe(
      'person.name+label@example.com',
    );
  });

  it('accepts a valid email at the 254-character persistence boundary', () => {
    const email = validEmailAtMaximumLength();

    expect(email).toHaveLength(254);
    expect(registerRequestSchema.safeParse({ email, password: validPassword }).success).toBe(true);
  });

  it.each([
    '',
    'not-an-email',
    '@example.com',
    'person@',
    `${validEmailAtMaximumLength()}x`,
  ])('rejects an invalid or oversized email: %s', (email) => {
    expect(registerRequestSchema.safeParse({ email, password: validPassword }).success).toBe(false);
  });

  it('reuses the inclusive T206 password boundaries', () => {
    const minimum = 'a'.repeat(passwordPolicy.minimumCodePoints);
    const maximum = '🔒'.repeat(passwordPolicy.maximumCodePoints);

    expect(registerRequestSchema.parse({ email: 'a@example.test', password: minimum }).password).toBe(
      minimum,
    );
    expect(registerRequestSchema.parse({ email: 'a@example.test', password: maximum }).password).toBe(
      maximum,
    );
  });

  it('applies the T206 NFC password normalization without trimming whitespace', () => {
    const decomposed = `  mot-de-passe-Cafe\u0301  `;

    expect(registerRequestSchema.parse({ email: 'a@example.test', password: decomposed }).password).toBe(
      decomposed.normalize('NFC'),
    );
  });

  it.each([
    'a'.repeat(passwordPolicy.minimumCodePoints - 1),
    'a'.repeat(passwordPolicy.maximumCodePoints + 1),
    `safe-prefix-long\ud800`,
  ])('rejects passwords forbidden by the T206 policy', (password) => {
    expect(registerRequestSchema.safeParse({ email: 'a@example.test', password }).success).toBe(false);
  });

  it('keeps displayName optional and trims an accepted value', () => {
    expect(registerRequestSchema.parse({ email: 'a@example.test', password: validPassword })).toEqual({
      email: 'a@example.test',
      password: validPassword,
    });
    expect(
      registerRequestSchema.parse({
        email: 'a@example.test',
        password: validPassword,
        displayName: '  Grace Hopper  ',
      }).displayName,
    ).toBe('Grace Hopper');
  });

  it('accepts 100 display-name characters and rejects blank or oversized values', () => {
    expect(
      registerRequestSchema.safeParse({
        email: 'a@example.test',
        password: validPassword,
        displayName: 'a'.repeat(100),
      }).success,
    ).toBe(true);

    for (const displayName of ['', '   ', 'a'.repeat(101)]) {
      expect(
        registerRequestSchema.safeParse({ email: 'a@example.test', password: validPassword, displayName })
          .success,
      ).toBe(false);
    }
  });

  it.each([
    'id',
    'passwordHash',
    'createdAt',
    'updatedAt',
    'roles',
    'authSession',
    'refreshToken',
  ])('strictly rejects the internal or unknown field %s', (field) => {
    expect(
      registerRequestSchema.safeParse({
        email: 'a@example.test',
        password: validPassword,
        [field]: 'client-controlled',
      }).success,
    ).toBe(false);
  });

  it.each([null, 'primitive', 42, true, [], ['a@example.test', validPassword]])(
    'rejects non-object request bodies: %j',
    (body) => {
      expect(registerRequestSchema.safeParse(body).success).toBe(false);
    },
  );

  it('rejects missing fields and incorrect public-field types', () => {
    const invalidBodies = [
      {},
      { email: 'a@example.test' },
      { password: validPassword },
      { email: 1, password: validPassword },
      { email: 'a@example.test', password: 1 },
      { email: 'a@example.test', password: validPassword, displayName: null },
    ];

    for (const body of invalidBodies) {
      expect(registerRequestSchema.safeParse(body).success).toBe(false);
    }
  });
});
