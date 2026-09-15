import { z } from 'zod';

import { normalizeEmail } from './register-schema.js';

export const loginRequestSchema = z
  .object({
    email: z
      .string()
      .trim()
      .max(254)
      .pipe(z.email())
      .transform(normalizeEmail),

    password: z
      .string()
      .min(1)
      .max(512),
    remember: z
      .boolean()
      .default(false),
  })
  .strict();

export type LoginRequest = z.infer<typeof loginRequestSchema>;