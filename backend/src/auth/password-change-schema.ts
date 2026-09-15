import { z } from 'zod';

import { isPasswordSafeToVerify } from './password-policy.js';
import { passwordSchema } from './register-schema.js';

const currentPasswordSchema = z
  .string()
  .min(1)
  .refine(isPasswordSafeToVerify, {
    message: 'Current password exceeds the supported verification bounds',
  });

export const changePasswordRequestSchema = z
  .object({
    currentPassword: currentPasswordSchema,
    newPassword: passwordSchema,
  })
  .strict();

export type ChangePasswordRequest = z.infer<typeof changePasswordRequestSchema>;
