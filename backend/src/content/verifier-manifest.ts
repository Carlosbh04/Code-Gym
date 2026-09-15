import { z } from 'zod';
import {
  conceptIdSchema,
  contentSessionIdSchema,
  exerciseIdSchema,
  technologyIdSchema,
  topicIdSchema,
  type ConceptId,
  type ContentSessionId,
  type ExerciseId,
  type TechnologyId,
  type TopicId,
} from './content-id.js';

export const verifierSchemaVersion =
  1;

export const verifierSessionStatusSchema =
  z.enum([
    'draft',
    'published',
    'updated',
    'deprecated',
    'legacy',
  ]);

export type VerifierSessionStatus =
  z.infer<
    typeof verifierSessionStatusSchema
  >;

export interface VerifierTestCase {
  readonly input: unknown;
  readonly expected: unknown;
  readonly call: string;
  readonly description: string;
}

export interface VerifierOptionStep {
  readonly id: ExerciseId;
  readonly type:
    | 'code-reading'
    | 'predict-output';
  readonly correctOptionIds:
    readonly string[];
  readonly hints: readonly string[];
}

export interface VerifierFindErrorStep {
  readonly id: ExerciseId;
  readonly type:
    'find-error';
  readonly errorLines:
    readonly number[];
  readonly errorType:
    string;
  readonly hints: readonly string[];
}

export interface VerifierFixCodeStep {
  readonly id: ExerciseId;
  readonly type:
    'fix-code';
  readonly testCases:
    readonly VerifierTestCase[];
  readonly hints: readonly string[];
}

export type VerifierStep =
  | VerifierOptionStep
  | VerifierFindErrorStep
  | VerifierFixCodeStep;

export interface VerifierSession {
  readonly id:
    ContentSessionId;

  readonly technologyId:
    TechnologyId;

  readonly topicId:
    TopicId;

  readonly conceptId:
    ConceptId;

  readonly status:
    VerifierSessionStatus;

  readonly totalExercises:
    number;

  readonly steps:
    readonly VerifierStep[];
}

export interface VerifierManifest {
  readonly schemaVersion:
    typeof verifierSchemaVersion;

  readonly sessions:
    readonly VerifierSession[];
}

const testCaseSchema =
  z.object({
    input:
      z.unknown(),

    expected:
      z.unknown(),

    call:
      z.string()
        .min(1),

    description:
      z.string(),
  });

const hintsSchema =
  z.array(
    z.string()
      .min(1),
  );

const optionStepSchema =
  z.object({
    id:
      exerciseIdSchema,

    type:
      z.enum([
        'code-reading',
        'predict-output',
      ]),

    correctOptionIds:
      z.array(
        z.string()
          .min(1)
          .max(191),
      )
        .min(1),

    hints:
      hintsSchema,
  });

const findErrorStepSchema =
  z.object({
    id:
      exerciseIdSchema,

    type:
      z.literal(
        'find-error',
      ),

    errorLines:
      z.array(
        z.number()
          .int()
          .positive(),
      )
        .min(1),

    errorType:
      z.string()
        .min(1),

    hints:
      hintsSchema,
  });

const fixCodeStepSchema =
  z.object({
    id:
      exerciseIdSchema,

    type:
      z.literal(
        'fix-code',
      ),

    testCases:
      z.array(
        testCaseSchema,
      )
        .min(1),

    hints:
      hintsSchema,
  });

const stepSchema =
  z.discriminatedUnion(
    'type',
    [
      optionStepSchema,
      findErrorStepSchema,
      fixCodeStepSchema,
    ],
  );

const sessionSchema =
  z.object({
    id:
      contentSessionIdSchema,

    technologyId:
      technologyIdSchema,

    topicId:
      topicIdSchema,

    conceptId:
      conceptIdSchema,

    status:
      verifierSessionStatusSchema,

    totalExercises:
      z.number()
        .int()
        .positive(),

    steps:
      z.array(
        stepSchema,
      )
        .min(1),
  });

export const verifierManifestSchema =
  z.object({
    schemaVersion:
      z.literal(
        verifierSchemaVersion,
      ),

    sessions:
      z.array(
        sessionSchema,
      ),
  });
