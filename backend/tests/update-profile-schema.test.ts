import { describe, expect, it } from 'vitest';

import { updateProfileRequestSchema } from '../src/auth/update-profile-schema.js';

describe('update profile request schema', () => {
  it('accepts only displayName and returns its trimmed representation', () => {
    expect(
      updateProfileRequestSchema.parse({
        displayName: '   Carlos Hernández   ',
      }),
    ).toEqual({
      displayName: 'Carlos Hernández',
    });
  });

  it.each(['', '   ', 'a'.repeat(101)])(
    'rejects an empty or oversized displayName',
    (displayName) => {
      expect(
        updateProfileRequestSchema.safeParse({
          displayName,
        }).success,
      ).toBe(false);
    },
  );

  it('accepts the inclusive 100 character boundary', () => {
    expect(
      updateProfileRequestSchema.safeParse({
        displayName: 'a'.repeat(100),
      }).success,
    ).toBe(true);
  });

  it.each([
    'userId',
    'email',
    'role',
    'password',
    'passwordHash',
    'createdAt',
    'updatedAt',
  ])('strictly rejects the extra field %s', (field) => {
    expect(
      updateProfileRequestSchema.safeParse({
        displayName: 'Ada',
        [field]: 'client-controlled',
      }).success,
    ).toBe(false);
  });
});
