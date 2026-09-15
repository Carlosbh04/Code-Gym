import { z } from 'zod';

import { PasswordPolicyError, validatePassword } from './password-policy.js';

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export const emailSchema = z
  .string()
  .transform(normalizeEmail)
  .pipe(z.email().max(254));

export const passwordSchema = z.string().transform((password, context) => {
  try {
    return validatePassword(password);
  } catch (error) {
    if (!(error instanceof PasswordPolicyError)) {
      throw error;
    }

    context.addIssue({
      code: 'custom',
      message: 'Password does not meet the password policy',
    });
    return z.NEVER;
  }
});

export const displayNameSchema = z.string().trim().min(1).max(100);

export const registerRequestSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    displayName: displayNameSchema.optional(),
  })
  .strict();

export type RegisterRequest = z.infer<typeof registerRequestSchema>;
