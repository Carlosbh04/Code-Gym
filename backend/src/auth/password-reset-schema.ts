import { z } from 'zod';

import {
  emailSchema,
  passwordSchema,
} from './register-schema.js';

const resetCodeSchema = z
  .string()
  .regex(/^\d{6}$/);

const resetTokenSchema = z
  .string()
  .regex(/^[A-Za-z0-9_-]{43}$/);

export const passwordResetRequestSchema = z
  .object({
    email: emailSchema,
  })
  .strict();

export const passwordResetVerifySchema = z
  .object({
    email: emailSchema,
    code: resetCodeSchema,
  })
  .strict();

export const passwordResetConfirmSchema = z
  .object({
    resetToken: resetTokenSchema,
    newPassword: passwordSchema,
  })
  .strict();

export type PasswordResetRequest = z.infer<typeof passwordResetRequestSchema>;
export type PasswordResetVerifyRequest = z.infer<typeof passwordResetVerifySchema>;
export type PasswordResetConfirmRequest = z.infer<typeof passwordResetConfirmSchema>;
