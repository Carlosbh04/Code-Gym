import {
  contentSessionIdSchema,
  exerciseIdSchema,
  type ConceptId,
  type ContentSessionId,
  type ExerciseId,
  type TechnologyId,
  type TopicId,
} from './content-id.js';
import type {
  VerifierManifestRepository,
} from './verifier-manifest-repository.js';
import {
  getPrivatePedagogicalRequirements,
  getPrivateVerifierTestCases,
} from './private-verifier-cases.js';
import type {
  PedagogicalRequirement,
} from './pedagogical-verifier.js';
import type {
  VerifierFixCodeStep,
  VerifierSession,
  VerifierSessionStatus,
  VerifierTestCase,
} from './verifier-manifest.js';

export interface VerifyAnswerInput {
  readonly sessionId: string;
  readonly exerciseId: string;
  readonly answer: unknown;
}

interface VerificationMetadata {
  readonly sessionId: ContentSessionId;
  readonly exerciseId: ExerciseId;
  readonly technologyId: TechnologyId;
  readonly topicId: TopicId;
  readonly conceptId: ConceptId;
  readonly status: VerifierSessionStatus;
  readonly totalExercises: number;
}

export interface ScoredAnswerVerification
extends VerificationMetadata {
  readonly kind: 'scored';
  readonly exerciseType:
    | 'code-reading'
    | 'predict-output'
    | 'find-error';
  readonly isCorrect: boolean;
}

export interface FixCodeAnswerVerification
extends VerificationMetadata {
  readonly kind: 'requires-code-execution';
  readonly exerciseType: 'fix-code';
  readonly userCode: string;
  readonly testCases:
    readonly VerifierTestCase[];
  readonly pedagogicalRequirements:
    readonly PedagogicalRequirement[];
}

export type AnswerVerification =
  | ScoredAnswerVerification
  | FixCodeAnswerVerification;

export interface VerifierSessionDefinition {
  readonly sessionId: ContentSessionId;
  readonly technologyId: TechnologyId;
  readonly topicId: TopicId;
  readonly conceptId: ConceptId;
  readonly status: VerifierSessionStatus;
  readonly totalExercises: number;
  readonly requiresCodeExecution: boolean;
  readonly exerciseIds:
    readonly ExerciseId[];
  readonly exercises:
    readonly VerifierExerciseDefinition[];
}

export interface VerifierExerciseDefinition {
  readonly id: ExerciseId;
  readonly hints: readonly string[];
}

export class ContentVerifier {
  public constructor(
    private readonly repository:
      VerifierManifestRepository,
  ) {}

  public getSessionDefinition(
    sessionIdInput: string,
  ): VerifierSessionDefinition | null {
    const sessionId =
      contentSessionIdSchema.parse(
        sessionIdInput,
      );

    const session =
      this.repository.getSessionById(
        sessionId,
      );

    if (session === null) {
      return null;
    }

    return Object.freeze({
      sessionId: session.id,
      technologyId:
        session.technologyId,
      topicId: session.topicId,
      conceptId: session.conceptId,
      status: session.status,
      totalExercises:
        session.totalExercises,
      requiresCodeExecution:
        session.steps.some(
          (step) =>
            step.type === 'fix-code',
        ),
      exerciseIds:
        Object.freeze(
          session.steps.map(
            (step) =>
              step.id,
          ),
        ),
      exercises:
        Object.freeze(
          session.steps.map(
            (step) =>
              Object.freeze({
                id: step.id,
                hints: step.hints,
              }),
          ),
        ),
    });
  }

  public verifyAnswer(
    input: VerifyAnswerInput,
  ): AnswerVerification {
    const sessionId =
      contentSessionIdSchema.parse(
        input.sessionId,
      );

    const exerciseId =
      exerciseIdSchema.parse(
        input.exerciseId,
      );

    const session =
      this.repository.getSessionById(
        sessionId,
      );

    if (session === null) {
      throw new VerifierSessionNotFoundError();
    }

    const step =
      session.steps.find(
        (candidate) =>
          candidate.id === exerciseId,
      );

    if (step === undefined) {
      throw new VerifierExerciseNotFoundError();
    }

    const metadata =
      verificationMetadata(
        session,
        exerciseId,
      );

    switch (step.type) {
      case 'code-reading':
      case 'predict-output': {
        if (
          typeof input.answer
          !== 'string'
        ) {
          throw new InvalidVerifierAnswerError();
        }

        return Object.freeze({
          ...metadata,
          kind: 'scored',
          exerciseType: step.type,
          isCorrect:
            step.correctOptionIds.includes(
              input.answer,
            ),
        });
      }

      case 'find-error': {
        const answer =
          parseFindErrorAnswer(
            input.answer,
          );

        return Object.freeze({
          ...metadata,
          kind: 'scored',
          exerciseType: 'find-error',
          isCorrect:
            step.errorLines.includes(
              answer.line,
            )
            && step.errorType
              === answer.errorType,
        });
      }

      case 'fix-code':
        return verifyFixCodeShape(
          metadata,
          step,
          input.answer,
        );
    }
  }
}

function verificationMetadata(
  session: VerifierSession,
  exerciseId: ExerciseId,
): VerificationMetadata {
  return {
    sessionId: session.id,
    exerciseId,
    technologyId:
      session.technologyId,
    topicId: session.topicId,
    conceptId: session.conceptId,
    status: session.status,
    totalExercises:
      session.totalExercises,
  };
}

interface FindErrorAnswer {
  readonly line: number;
  readonly errorType: string;
}

function parseFindErrorAnswer(
  answer: unknown,
): FindErrorAnswer {
  if (
    typeof answer !== 'object'
    || answer === null
    || !('line' in answer)
    || !('errorType' in answer)
  ) {
    throw new InvalidVerifierAnswerError();
  }

  const {
    line,
    errorType,
  } = answer as {
    readonly line: unknown;
    readonly errorType: unknown;
  };

  if (
    !Number.isSafeInteger(line)
    || (
      typeof line === 'number'
      && line <= 0
    )
    || typeof errorType !== 'string'
    || errorType.length === 0
  ) {
    throw new InvalidVerifierAnswerError();
  }

  return Object.freeze({
    line: line as number,
    errorType,
  });
}

function verifyFixCodeShape(
  metadata: VerificationMetadata,
  step: VerifierFixCodeStep,
  answer: unknown,
): FixCodeAnswerVerification {
  if (
    typeof answer !== 'string'
    || answer.trim() === ''
  ) {
    throw new InvalidVerifierAnswerError();
  }

  return Object.freeze({
    ...metadata,
    kind: 'requires-code-execution',
    exerciseType: 'fix-code',
    userCode: answer,
    testCases: Object.freeze([
      ...step.testCases,
      ...getPrivateVerifierTestCases(
        metadata.sessionId,
        metadata.exerciseId,
      ),
    ]),
    pedagogicalRequirements:
      getPrivatePedagogicalRequirements(
        metadata.sessionId,
        metadata.exerciseId,
      ),
  });
}

export class VerifierSessionNotFoundError
extends Error {
  public constructor() {
    super('Verifier session was not found');
    this.name =
      'VerifierSessionNotFoundError';
  }
}

export class VerifierExerciseNotFoundError
extends Error {
  public constructor() {
    super('Verifier exercise was not found');
    this.name =
      'VerifierExerciseNotFoundError';
  }
}

export class InvalidVerifierAnswerError
extends Error {
  public constructor() {
    super('Answer does not match exercise type');
    this.name =
      'InvalidVerifierAnswerError';
  }
}
