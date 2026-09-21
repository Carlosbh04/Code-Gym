import {
  InvalidVerifierAnswerError,
  VerifierExerciseNotFoundError,
  VerifierSessionNotFoundError,
  type ContentVerifier,
} from '../content/content-verifier.js';
import {
  conceptIdSchema,
  contentSessionIdSchema,
  exerciseIdSchema,
} from '../content/content-id.js';
import type {
  CanonicalTrainingSessionMetadata,
  ContentRepository,
} from '../content/content-repository.js';
import {
  LearningConceptNotFoundError,
  type LearningProgressService,
} from '../progress/learning-progress-service.js';
import {
  CodeExecutionUnavailableError,
  type CodeExecutionResult,
  type CodeExecutionService,
} from '../code-execution/code-execution-service.js';
import {
  combineVerificationResult,
  evaluatePedagogicalRequirements,
} from '../content/pedagogical-verifier.js';
import type {
  TrainingRepository,
  TrainingRunRecord,
} from './training-repository.js';
import {
  TrainingExerciseOutOfOrderError,
  TrainingHintsExhaustedError,
} from './training-repository.js';

export interface StartTrainingRunInput {
  readonly userId: string;
  readonly sessionId: string;
}

export interface SubmitTrainingAnswerInput {
  readonly userId: string;
  readonly runId: string;
  readonly exerciseId: string;
  readonly answer: unknown;
  readonly durationMs: number;
}

export interface RevealTrainingHintInput {
  readonly userId: string;
  readonly runId: string;
  readonly exerciseId: string;
}

export interface ExecuteTrainingCodePreviewInput {
  readonly userId: string;
  readonly runId: string;
  readonly exerciseId: string;
  readonly code: unknown;
}

export interface TrainingCodePreviewResultView {
  readonly execution: CodeExecutionResult;
}

export interface TrainingHintResultView {
  readonly hint: {
    readonly index: number;
    readonly text: string;
    readonly totalHints: number;
  };
}

export interface TrainingRunView {
  readonly id: string;
  readonly sessionId: string;
  readonly technologyId: string;
  readonly topicId: string;
  readonly conceptId: string;
  readonly status:
    | 'active'
    | 'completed';
  readonly totalExercises: number;
  readonly answeredExercises: number;
  readonly correctExercises: number;
  readonly durationMs: number;
  readonly hintsUsed: number;
  readonly startedAt: string;
  readonly completedAt: string | null;
}

export interface TrainingAnswerResultView {
  readonly verification: {
    readonly functionalCorrect: boolean;
    readonly pedagogicalRequirementsMet: boolean;
    readonly overallPassed: boolean;
    readonly feedback: readonly string[];
  } | null;
  readonly attempt: {
    readonly id: string;
    readonly exerciseId: string;
    readonly isCorrect: boolean;
    readonly attemptedAt: string;
    readonly durationMs: number;
    readonly hintsUsed: number;
  };
  readonly run: TrainingRunView;
  readonly execution:
    CodeExecutionResult | null;
  readonly completion: {
    readonly id: string;
    readonly completedAt: string;
    readonly totalExercises: number;
    readonly correctExercises: number;
    readonly durationMs: number;
    readonly hintsUsed: number;
    readonly accuracy: number;
  } | null;
}

export type TrainingClock =
  () => Date;

export class TrainingService {
  public constructor(
    private readonly repository:
      TrainingRepository,
    private readonly contentVerifier:
      ContentVerifier,
    private readonly clock:
      TrainingClock =
        () => new Date(),
    private readonly codeExecutionService?:
      CodeExecutionService,
    private readonly learningProgressService?:
      Pick<
        LearningProgressService,
        | 'getLevelState'
        | 'reconcileTrainingCompletionForLevel'
        | 'canStartRequiredPracticeForLevel'
      >,
    private readonly contentRepository?:
      Pick<
        ContentRepository,
        'getCanonicalTrainingSessionMetadata'
      >,
  ) {}

  public async startRun(
    input: StartTrainingRunInput,
  ): Promise<TrainingRunView> {
    const sessionId =
      contentSessionIdSchema.parse(
        input.sessionId,
      );

    const definition =
      this.contentVerifier
        .getSessionDefinition(
          sessionId,
        );

    if (definition === null) {
      throw new VerifierSessionNotFoundError();
    }

    if (
      definition.status !== 'published'
      && definition.status !== 'updated'
    ) {
      throw new TrainingSessionUnavailableError();
    }

    if (
      definition.requiresCodeExecution
      && this.codeExecutionService === undefined
    ) {
      throw new TrainingCodeExecutionUnavailableError();
    }

    const activeRun =
      await this.repository
        .findActiveOwnedRunBySession?.(
          input.userId,
          sessionId,
        );

    if (activeRun !== undefined && activeRun !== null) {
      return toTrainingRunView(
        activeRun,
      );
    }

    await this.assertLearningSessionAvailable(
      input.userId,
      sessionId,
    );

    const run =
      await this.repository.createRun({
        userId: input.userId,
        sessionId: definition.sessionId,
        technologyId:
          definition.technologyId,
        topicId:
          definition.topicId,
        conceptId:
          definition.conceptId,
        totalExercises:
          definition.totalExercises,
        startedAt:
          this.clock(),
      });

    return toTrainingRunView(
      run,
    );
  }

  private async assertLearningSessionAvailable(
    userId: string,
    sessionId: string,
  ): Promise<void> {
    if (
      this.learningProgressService === undefined
      || this.contentRepository === undefined
    ) {
      throw new TrainingProgressionUnavailableError();
    }

    const metadata =
      await this.contentRepository
        .getCanonicalTrainingSessionMetadata(
          sessionId,
        );

    if (metadata === null) {
      throw new TrainingSessionUnavailableError();
    }

    if (
      !metadata.progressionEnabled
    ) {
      return;
    }

    let state;

    try {
      state =
        await this.learningProgressService
          .getLevelState(
            userId,
            conceptIdSchema.parse(
              metadata.conceptId,
            ),
            metadata.levelId,
          );
    } catch (error) {
      if (
        error instanceof
          LearningConceptNotFoundError
      ) {
        throw new TrainingSessionUnavailableError();
      }

      throw error;
    }

    if (state.locked) {
      throw new TrainingSessionLockedError(
        metadata.kind,
      );
    }

    if (
      metadata.kind === 'QUIZ'
      && state.stages.theory.status
        !== 'completed'
    ) {
      throw new TrainingSessionLockedError(
        metadata.kind,
      );
    }

    if (
      metadata.kind === 'PRACTICE'
      && state.stages.quiz.status
        !== 'completed'
    ) {
      throw new TrainingSessionLockedError(
        metadata.kind,
      );
    }

    if (
      metadata.kind === 'PRACTICE'
      && metadata.requiredForProgression
    ) {
      const canStart =
        await this.learningProgressService
          .canStartRequiredPracticeForLevel(
            userId,
            conceptIdSchema.parse(
              metadata.conceptId,
            ),
            metadata.levelId,
            metadata.position,
          );

      if (!canStart) {
        throw new TrainingSessionLockedError(
          metadata.kind,
        );
      }
    }

    if (
      metadata.kind === 'CHECKPOINT'
      && state.stages.practice.status
        !== 'completed'
    ) {
      throw new TrainingSessionLockedError(
        metadata.kind,
      );
    }
  }

  public async executeCodePreview(
    input: ExecuteTrainingCodePreviewInput,
  ): Promise<TrainingCodePreviewResultView> {
    const run =
      await this.repository
        .findOwnedRun(
          input.userId,
          input.runId,
        );

    if (run === null) {
      throw new TrainingRunNotFoundPublicError();
    }

    if (run.status !== 'ACTIVE') {
      throw new TrainingRunClosedPublicError();
    }

    const exerciseId =
      exerciseIdSchema.parse(
        input.exerciseId,
      );

    const definition =
      this.contentVerifier
        .getSessionDefinition(
          run.sessionId,
        );

    if (definition === null) {
      throw new TrainingContentMismatchError();
    }

    assertVerificationMatchesRun(
      run,
      definition,
    );

    const expectedExerciseId =
      definition.exerciseIds[
        run.answeredExercises
      ];

    if (expectedExerciseId === undefined) {
      throw new TrainingContentMismatchError();
    }

    if (
      exerciseId !== expectedExerciseId
    ) {
      throw new TrainingExerciseOutOfOrderError();
    }

    if (this.codeExecutionService === undefined) {
      throw new TrainingCodeExecutionUnavailableError();
    }

    const preview =
      this.contentVerifier
        .prepareCodePreview({
          sessionId:
            run.sessionId,
          exerciseId,
          code:
            input.code,
        });

    assertVerificationMatchesRun(
      run,
      preview,
    );

    try {
      const execution =
        await this.codeExecutionService.execute({
          code:
            preview.userCode,
          testCases:
            preview.testCases,
        });

      return Object.freeze({
        execution:
          Object.freeze({
            passed:
              execution.passed,
            reason:
              execution.reason,
          }),
      });
    } catch (error) {
      if (
        error instanceof
          CodeExecutionUnavailableError
      ) {
        throw new TrainingCodeExecutionUnavailableError();
      }

      throw error;
    }
  }

  public async submitAnswer(
    input: SubmitTrainingAnswerInput,
  ): Promise<TrainingAnswerResultView> {
    assertNonNegativeInteger(
      input.durationMs,
      'durationMs',
    );
    const run =
      await this.repository
        .findOwnedRun(
          input.userId,
          input.runId,
        );

    if (run === null) {
      throw new TrainingRunNotFoundPublicError();
    }

    if (run.status !== 'ACTIVE') {
      throw new TrainingRunClosedPublicError();
    }

    const exerciseId =
      exerciseIdSchema.parse(
        input.exerciseId,
      );

    const definition =
      this.contentVerifier
        .getSessionDefinition(
          run.sessionId,
        );

    if (definition === null) {
      throw new TrainingContentMismatchError();
    }

    assertVerificationMatchesRun(
      run,
      definition,
    );

    if (
      !definition.exerciseIds.includes(
        exerciseId,
      )
    ) {
      throw new VerifierExerciseNotFoundError();
    }

    const expectedExerciseId =
      definition.exerciseIds[
        run.answeredExercises
      ];

    if (expectedExerciseId === undefined) {
      throw new TrainingContentMismatchError();
    }

    if (
      exerciseId !==
        expectedExerciseId
    ) {
      throw new TrainingExerciseOutOfOrderError();
    }

    const verification =
      this.contentVerifier
        .verifyAnswer({
          sessionId:
            run.sessionId,
          exerciseId,
          answer:
            input.answer,
        });

    let isCorrect: boolean;
    let executionResult:
      CodeExecutionResult | null = null;
    let verificationResult:
      {
        readonly functionalCorrect: boolean;
        readonly pedagogicalRequirementsMet: boolean;
        readonly overallPassed: boolean;
        readonly feedback: readonly string[];
      } | null = null;

    if (
      verification.kind
      === 'requires-code-execution'
    ) {
      if (this.codeExecutionService === undefined) {
        throw new TrainingCodeExecutionUnavailableError();
      }

      try {
        const execution =
          await this.codeExecutionService.execute({
            code: verification.userCode,
            testCases: verification.testCases,
          });
        executionResult =
          Object.freeze({
            passed: execution.passed,
            reason: execution.reason,
          });

        const pedagogicalResult =
          evaluatePedagogicalRequirements(
            verification.userCode,
            verification.pedagogicalRequirements,
          );

        const combinedVerification =
          combineVerificationResult(
            executionResult.passed,
            pedagogicalResult,
          );

        verificationResult =
          combinedVerification;

        isCorrect =
          combinedVerification.overallPassed;
      } catch (error) {
        if (error instanceof CodeExecutionUnavailableError) {
          throw new TrainingCodeExecutionUnavailableError();
        }
        throw error;
      }
    } else {
      isCorrect = verification.isCorrect;
    }

    assertVerificationMatchesRun(
      run,
      verification,
    );

    const isFinalAnswer =
      run.answeredExercises + 1
      === run.totalExercises;

    let completionMetadata:
      CanonicalTrainingSessionMetadata | null =
        null;

    if (isFinalAnswer) {
      if (
        this.learningProgressService === undefined
        || this.contentRepository === undefined
      ) {
        throw new TrainingProgressionUnavailableError();
      }

      completionMetadata =
        await this.contentRepository
          .getCanonicalTrainingSessionMetadata(
            run.sessionId,
          );

      if (completionMetadata === null) {
        throw new TrainingSessionUnavailableError();
      }
    }

    const recorded =
      await this.repository
        .recordScoredAnswerAndMaybeComplete({
          userId: input.userId,
          runId: run.id,
          exerciseId:
            verification.exerciseId,
          exercisePosition:
            run.answeredExercises,
          isCorrect,
          durationMs:
            input.durationMs,
          attemptedAt:
            this.clock(),
        });

    if (
      recorded.completion !== null
      && completionMetadata !== null
      && completionMetadata.progressionEnabled
    ) {
      const learningProgressService =
        this.learningProgressService;

      if (
        learningProgressService === undefined
      ) {
        throw new TrainingProgressionUnavailableError();
      }

      await learningProgressService
        .reconcileTrainingCompletionForLevel(
          input.userId,
          {
            conceptId:
              conceptIdSchema.parse(
                completionMetadata.conceptId,
              ),

            levelId:
              completionMetadata.levelId,

            kind:
              completionMetadata.kind,

            passingPercentage:
              completionMetadata
                .passingPercentage,

            requiredForProgression:
              completionMetadata
                .requiredForProgression,

            totalExercises:
              recorded.completion
                .totalExercises,

            correctExercises:
              recorded.completion
                .correctExercises,

            completedAt:
              recorded.completion
                .completedAt,
          },
        );
    }

    return Object.freeze({
      verification:
        verificationResult === null
          ? null
          : Object.freeze({
              functionalCorrect:
                verificationResult.functionalCorrect,

              pedagogicalRequirementsMet:
                verificationResult
                  .pedagogicalRequirementsMet,

              overallPassed:
                verificationResult.overallPassed,

              feedback:
                Object.freeze([
                  ...verificationResult.feedback,
                ]),
            }),

      attempt: Object.freeze({
        id: recorded.attempt.id,
        exerciseId:
          recorded.attempt.exerciseId,
        isCorrect:
          recorded.attempt.isCorrect,
        attemptedAt:
          recorded.attempt.attemptedAt
            .toISOString(),
        durationMs:
          recorded.attempt.durationMs,
        hintsUsed:
          recorded.attempt.hintsUsed,
      }),
      run:
        toTrainingRunView(
          recorded.run,
        ),
      execution:
        executionResult,
      completion:
        recorded.completion === null
          ? null
          : Object.freeze({
              id:
                recorded.completion.id,
              completedAt:
                recorded.completion.completedAt
                  .toISOString(),
              totalExercises:
                recorded.completion.totalExercises,
              correctExercises:
                recorded.completion.correctExercises,
              durationMs:
                recorded.completion.durationMs,
              hintsUsed:
                recorded.completion.hintsUsed,
              accuracy:
                recorded.completion.totalExercises
                  === 0
                  ? 0
                  : recorded.completion.correctExercises
                    / recorded.completion.totalExercises,
            }),
    });
  }

  public async revealHint(
    input: RevealTrainingHintInput,
  ): Promise<TrainingHintResultView> {
    const run =
      await this.repository.findOwnedRun(
        input.userId,
        input.runId,
      );

    if (run === null) {
      throw new TrainingRunNotFoundPublicError();
    }

    if (run.status !== 'ACTIVE') {
      throw new TrainingRunClosedPublicError();
    }

    const exerciseId =
      exerciseIdSchema.parse(
        input.exerciseId,
      );
    const definition =
      this.contentVerifier.getSessionDefinition(
        run.sessionId,
      );

    if (definition === null) {
      throw new TrainingContentMismatchError();
    }

    assertVerificationMatchesRun(
      run,
      definition,
    );

    const exercisePosition =
      definition.exerciseIds.indexOf(
        exerciseId,
      );

    if (exercisePosition < 0) {
      throw new VerifierExerciseNotFoundError();
    }

    if (
      exercisePosition
      !== run.answeredExercises
    ) {
      throw new TrainingExerciseOutOfOrderError();
    }

    const exercise =
      definition.exercises[
        exercisePosition
      ];

    if (
      exercise === undefined
      || exercise.id !== exerciseId
    ) {
      throw new TrainingContentMismatchError();
    }

    const reveal =
      await this.repository.revealNextHint({
        userId: input.userId,
        runId: run.id,
        exerciseId,
        exercisePosition,
        totalHints:
          exercise.hints.length,
        revealedAt:
          this.clock(),
      });
    const text =
      exercise.hints[reveal.index];

    if (text === undefined) {
      throw new TrainingContentMismatchError();
    }

    return Object.freeze({
      hint: Object.freeze({
        index: reveal.index,
        text,
        totalHints:
          exercise.hints.length,
      }),
    });
  }
}

function toTrainingRunView(
  run: TrainingRunRecord,
): TrainingRunView {
  return Object.freeze({
    id: run.id,
    sessionId: run.sessionId,
    technologyId:
      run.technologyId,
    topicId: run.topicId,
    conceptId: run.conceptId,
    status:
      run.status === 'ACTIVE'
        ? 'active'
        : 'completed',
    totalExercises:
      run.totalExercises,
    answeredExercises:
      run.answeredExercises,
    correctExercises:
      run.correctExercises,
    durationMs:
      run.durationMs,
    hintsUsed:
      run.hintsUsed,
    startedAt:
      run.startedAt.toISOString(),
    completedAt:
      run.completedAt?.toISOString()
      ?? null,
  });
}

function assertNonNegativeInteger(
  value: number,
  name: string,
): void {
  if (
    !Number.isSafeInteger(value)
    || value < 0
  ) {
    throw new InvalidTrainingAnswerMetadataError(
      name,
    );
  }
}

function assertVerificationMatchesRun(
  run: TrainingRunRecord,
  verification: {
    readonly sessionId: string;
    readonly technologyId: string;
    readonly topicId: string;
    readonly conceptId: string;
    readonly totalExercises: number;
  },
): void {
  if (
    verification.sessionId
      !== run.sessionId
    || verification.technologyId
      !== run.technologyId
    || verification.topicId
      !== run.topicId
    || verification.conceptId
      !== run.conceptId
    || verification.totalExercises
      !== run.totalExercises
  ) {
    throw new TrainingContentMismatchError();
  }
}

export {
  InvalidVerifierAnswerError,
  TrainingExerciseOutOfOrderError,
  TrainingHintsExhaustedError,
  VerifierExerciseNotFoundError,
};

export class TrainingProgressionUnavailableError
extends Error {
  public constructor() {
    super(
      'Training progression dependencies are unavailable',
    );

    this.name =
      'TrainingProgressionUnavailableError';
  }
}

export class TrainingSessionLockedError
extends Error {
  public constructor(
    public readonly kind:
      CanonicalTrainingSessionMetadata['kind'],
  ) {
    super(
      `Training session ${kind} is locked by learning progression`,
    );

    this.name =
      'TrainingSessionLockedError';
  }
}

export class TrainingRunNotFoundPublicError
extends Error {
  public constructor() {
    super('Training run was not found');
    this.name =
      'TrainingRunNotFoundPublicError';
  }
}

export class TrainingRunClosedPublicError
extends Error {
  public constructor() {
    super('Training run is closed');
    this.name =
      'TrainingRunClosedPublicError';
  }
}

export class TrainingSessionUnavailableError
extends Error {
  public constructor() {
    super('Training session is unavailable');
    this.name =
      'TrainingSessionUnavailableError';
  }
}

export class TrainingCodeExecutionUnavailableError
extends Error {
  public constructor() {
    super('Code execution is not available yet');
    this.name =
      'TrainingCodeExecutionUnavailableError';
  }
}

export class InvalidTrainingAnswerMetadataError
extends Error {
  public constructor(
    field: string,
  ) {
    super(`Invalid training answer metadata: ${field}`);
    this.name =
      'InvalidTrainingAnswerMetadataError';
  }
}

export class TrainingContentMismatchError
extends Error {
  public constructor() {
    super('Training content does not match run');
    this.name =
      'TrainingContentMismatchError';
  }
}
