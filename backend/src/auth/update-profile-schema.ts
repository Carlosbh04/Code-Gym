import { z } from 'zod';

import { displayNameSchema } from './register-schema.js';

export const updateProfileRequestSchema = z
  .object({
    displayName: displayNameSchema,
  })
  .strict();

export type UpdateProfileRequest = z.infer<typeof updateProfileRequestSchema>;
