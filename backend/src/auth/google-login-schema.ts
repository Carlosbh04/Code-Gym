import { z } from 'zod';

export const googleLoginRequestSchema = z
  .object({
    idToken: z
      .string()
      .trim()
      .min(1)
      .max(8_192),
  })
  .strict();

export type GoogleLoginRequest =
  z.infer<
    typeof googleLoginRequestSchema
  >;
