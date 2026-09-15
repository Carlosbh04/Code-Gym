import { z } from 'zod';

/**
 * Persistence boundary shared by the current progress models.
 *
 * Attempt, CompletedSession and ConceptProgress persist external content
 * references as VARCHAR(191). Content IDs therefore must never exceed this
 * limit before reaching a repository.
 */
export const contentIdMaximumLength = 191;

/**
 * CodeGym content IDs are canonical ASCII lowercase slugs.
 *
 * Current frontend examples:
 *
 * technology: javascript
 * topic:      js-arrays
 * concept:    js-array-iteration
 * session:    js-arrays-map-vs-foreach-01
 * exercise:   step-1
 *
 * The backend deliberately does not normalize these values. Whitespace,
 * uppercase characters or another representation are rejected instead of
 * being silently changed into a different identifier.
 */
const canonicalContentIdPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * These identifiers are syntactically valid slugs but are reserved because
 * they are special object-property names in JavaScript and must never become
 * canonical CodeGym content identifiers.
 */
const reservedContentIds = new Set([
  'constructor',
  'prototype',
]);

const baseContentIdSchema = z
  .string()
  .min(1)
  .max(contentIdMaximumLength)
  .regex(canonicalContentIdPattern)
  .refine(
    (value) => !reservedContentIds.has(value),
    'Reserved content identifier',
  );

/**
 * Identifies one technology in the frontend-owned content catalog.
 */
export const technologyIdSchema =
  baseContentIdSchema.brand<'TechnologyId'>();

/**
 * Identifies one topic in the frontend-owned content catalog.
 */
export const topicIdSchema =
  baseContentIdSchema.brand<'TopicId'>();

/**
 * Identifies one concept in the frontend-owned content catalog.
 */
export const conceptIdSchema =
  baseContentIdSchema.brand<'ConceptId'>();

/**
 * Identifies one exercise session in the frontend-owned content catalog.
 */
export const contentSessionIdSchema =
  baseContentIdSchema.brand<'ContentSessionId'>();

/**
 * Backend Attempt.exerciseId corresponds to the stable identifier of the
 * exercise/step attempted inside a content session.
 */
export const exerciseIdSchema =
  baseContentIdSchema.brand<'ExerciseId'>();

export type TechnologyId =
  z.infer<typeof technologyIdSchema>;

export type TopicId =
  z.infer<typeof topicIdSchema>;

export type ConceptId =
  z.infer<typeof conceptIdSchema>;

export type ContentSessionId =
  z.infer<typeof contentSessionIdSchema>;

export type ExerciseId =
  z.infer<typeof exerciseIdSchema>;