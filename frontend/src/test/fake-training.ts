import type {
  TrainingAnswerResult,
  TrainingRun,
} from '@/features/training/training-api';

import type {
  SubmitTrainingAnswerInput,
  TrainingContextValue,
} from '@/contexts/training-context';

export class FakeTraining {
  readonly startCalls: string[] = [];

  readonly submitCalls: Array<{
    runId: string;
    input: SubmitTrainingAnswerInput;
  }> = [];

  readonly revealCalls: Array<{
    runId: string;
    exerciseId: string;
  }> = [];

  runId = 'training-run-test-1';

  answerIsCorrect = true;

  startError: Error | null = null;
  submitError: Error | null = null;
  revealError: Error | null = null;
  readonly hintTexts = [
    'Pista autorizada 1',
    'Pista autorizada 2',
    'Pista autorizada 3',
  ];

  readonly value: TrainingContextValue = {
    startRun: async (
      sessionId,
    ) => {
      this.startCalls.push(
        sessionId,
      );

      if (this.startError !== null) {
        throw this.startError;
      }

      return this.makeRun(
        sessionId,
      );
    },

    submitAnswer: async (
      runId,
      input,
    ) => {
      this.submitCalls.push({
        runId,
        input,
      });

      if (this.submitError !== null) {
        throw this.submitError;
      }

      return this.makeAnswerResult(
        runId,
        input,
      );
    },

    revealHint: async (runId, exerciseId) => {
      this.revealCalls.push({ runId, exerciseId });
      if (this.revealError !== null) {
        throw this.revealError;
      }
      const index = this.revealCalls.filter(
        (call) => call.runId === runId && call.exerciseId === exerciseId,
      ).length - 1;
      const text = this.hintTexts[index] ?? `Pista autorizada ${index + 1}`;
      return { index, text, totalHints: this.hintTexts.length };
    },
  };

  private makeRun(
    sessionId: string,
  ): TrainingRun {
    return {
      id: this.runId,
      sessionId,
      technologyId: 'javascript',
      topicId: 'arrays',
      conceptId: 'map-vs-foreach',
      status: 'active',
      totalExercises: 4,
      answeredExercises: 0,
      correctExercises: 0,
      durationMs: 0,
      hintsUsed: 0,
      startedAt:
        '2026-09-12T12:00:00.000Z',
      completedAt: null,
    };
  }

  private makeAnswerResult(
    runId: string,
    input: SubmitTrainingAnswerInput,
  ): TrainingAnswerResult {
    const authoritativeHintsUsed = this.revealCalls.filter(
      (call) => call.runId === runId && call.exerciseId === input.exerciseId,
    ).length;
    return {
      attempt: {
        id: 'attempt-test-1',
        exerciseId:
          input.exerciseId,
        isCorrect:
          this.answerIsCorrect,
        attemptedAt:
          '2026-09-12T12:01:00.000Z',
        durationMs:
          input.durationMs,
        hintsUsed:
          authoritativeHintsUsed,
      },

      run: {
        ...this.makeRun(
          'js-arrays-map-vs-foreach-01',
        ),
        id: runId,
        status:
          this.submitCalls.length === 4
            ? 'completed'
            : 'active',
        answeredExercises:
          this.submitCalls.length,
        correctExercises:
          this.answerIsCorrect
            ? 1
            : 0,
        durationMs:
          input.durationMs,
        hintsUsed:
          authoritativeHintsUsed,
      },

      verification: {
        functionalCorrect:
          this.answerIsCorrect,

        pedagogicalRequirementsMet:
          this.answerIsCorrect,

        overallPassed:
          this.answerIsCorrect,

        feedback:
          [],
      },

      execution: {
        passed:
          this.answerIsCorrect,

        reason:
          this.answerIsCorrect
            ? 'passed'
            : 'failed',
      },

      completion:
        this.submitCalls.length === 4
          ? {
              id: 'completed-session-test-1',
              completedAt:
                '2026-09-12T12:04:00.000Z',
              totalExercises: 4,
              correctExercises:
                this.answerIsCorrect
                  ? 4
                  : 3,
              durationMs:
                this.submitCalls.reduce(
                  (total, call) =>
                    total +
                    call.input.durationMs,
                  0,
                ),
              hintsUsed:
                this.submitCalls.reduce(
                  (total, call) =>
                    total +
                    this.revealCalls.filter(
                      (reveal) =>
                        reveal.runId === call.runId
                        && reveal.exerciseId === call.input.exerciseId,
                    ).length,
                  0,
                ),
              accuracy:
                this.answerIsCorrect
                  ? 1
                  : 0.75,
            }
          : null,
    };
  }
}
