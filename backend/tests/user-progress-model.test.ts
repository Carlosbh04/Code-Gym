import {
  describe,
  expect,
  it,
} from 'vitest';

import {
  assertAttemptProgress,
  assertCompletedSessionProgress,
  assertProgressCounters,
  calculateAccuracy,
  ProgressInvariantError,
} from '../src/progress/user-progress-model.js';

describe(
  'user progress model (T222)',
  () => {
    describe(
      'calculateAccuracy',
      () => {
        it(
          'calculates accuracy from integer counters',
          () => {
            expect(
              calculateAccuracy(
                3,
                4,
              ),
            ).toBe(0.75);
          },
        );

        it(
          'returns null when no attempts exist',
          () => {
            expect(
              calculateAccuracy(
                0,
                0,
              ),
            ).toBeNull();
          },
        );

        it(
          'accepts perfect accuracy',
          () => {
            expect(
              calculateAccuracy(
                4,
                4,
              ),
            ).toBe(1);
          },
        );

        it(
          'accepts zero correct attempts',
          () => {
            expect(
              calculateAccuracy(
                0,
                4,
              ),
            ).toBe(0);
          },
        );

        it.each([
          [-1, 1],
          [0, -1],
          [1.5, 2],
          [1, 2.5],
          [Number.NaN, 1],
          [Number.POSITIVE_INFINITY, 1],
          [
            Number.MAX_SAFE_INTEGER + 1,
            Number.MAX_SAFE_INTEGER + 1,
          ],
        ])(
          'rejects invalid accuracy counters: %j / %j',
          (
            correct,
            total,
          ) => {
            expect(
              () =>
                calculateAccuracy(
                  correct,
                  total,
                ),
            ).toThrow(
              ProgressInvariantError,
            );
          },
        );

        it(
          'rejects correct values above total',
          () => {
            expect(
              () =>
                calculateAccuracy(
                  5,
                  4,
                ),
            ).toThrow(
              ProgressInvariantError,
            );
          },
        );
      },
    );

    describe(
      'concept progress counters',
      () => {
        it(
          'accepts a valid aggregate snapshot',
          () => {
            expect(
              () => { assertProgressCounters({
                  totalAttempts: 12,
                  correctAttempts: 9,
                  completedSessions: 3,
                }); },
            ).not.toThrow();
          },
        );

        it(
          'accepts an empty aggregate',
          () => {
            expect(
              () => { assertProgressCounters({
                  totalAttempts: 0,
                  correctAttempts: 0,
                  completedSessions: 0,
                }); },
            ).not.toThrow();
          },
        );

        it(
          'rejects correctAttempts above totalAttempts',
          () => {
            expect(
              () => { assertProgressCounters({
                  totalAttempts: 1,
                  correctAttempts: 2,
                  completedSessions: 0,
                }); },
            ).toThrow(
              ProgressInvariantError,
            );
          },
        );

        it.each([
          {
            totalAttempts: -1,
            correctAttempts: 0,
            completedSessions: 0,
          },
          {
            totalAttempts: 1.5,
            correctAttempts: 0,
            completedSessions: 0,
          },
          {
            totalAttempts: 1,
            correctAttempts: -1,
            completedSessions: 0,
          },
          {
            totalAttempts: 1,
            correctAttempts: 0,
            completedSessions: -1,
          },
          {
            totalAttempts:
              Number.POSITIVE_INFINITY,
            correctAttempts: 0,
            completedSessions: 0,
          },
        ])(
          'rejects invalid aggregate counters: %j',
          (counters) => {
            expect(
              () => { assertProgressCounters(
                  counters,
                ); },
            ).toThrow(
              ProgressInvariantError,
            );
          },
        );
      },
    );

    describe(
      'completed session invariants',
      () => {
        it(
          'accepts valid completed-session metrics',
          () => {
            expect(
              () => { assertCompletedSessionProgress({
                  totalExercises: 8,
                  correctExercises: 6,
                  durationMs: 45_000,
                  hintsUsed: 2,
                }); },
            ).not.toThrow();
          },
        );

        it(
          'rejects an empty completed session',
          () => {
            expect(
              () => { assertCompletedSessionProgress({
                  totalExercises: 0,
                  correctExercises: 0,
                  durationMs: 1,
                  hintsUsed: 0,
                }); },
            ).toThrow(
              ProgressInvariantError,
            );
          },
        );

        it(
          'rejects more correct exercises than total exercises',
          () => {
            expect(
              () => { assertCompletedSessionProgress({
                  totalExercises: 2,
                  correctExercises: 3,
                  durationMs: 1,
                  hintsUsed: 0,
                }); },
            ).toThrow(
              ProgressInvariantError,
            );
          },
        );

        it.each([
          {
            totalExercises: 1,
            correctExercises: -1,
            durationMs: 1,
            hintsUsed: 0,
          },
          {
            totalExercises: 1,
            correctExercises: 0,
            durationMs: -1,
            hintsUsed: 0,
          },
          {
            totalExercises: 1,
            correctExercises: 0,
            durationMs: 1,
            hintsUsed: -1,
          },
          {
            totalExercises: 1.5,
            correctExercises: 1,
            durationMs: 1,
            hintsUsed: 0,
          },
        ])(
          'rejects invalid completed-session metrics: %j',
          (event) => {
            expect(
              () => { assertCompletedSessionProgress(
                  event,
                ); },
            ).toThrow(
              ProgressInvariantError,
            );
          },
        );
      },
    );

    describe(
      'attempt invariants',
      () => {
        it.each([
          {
            durationMs: null,
            hintsUsed: null,
          },
          {
            durationMs: 0,
            hintsUsed: 0,
          },
          {
            durationMs: 1_250,
            hintsUsed: 2,
          },
        ])(
          'accepts valid optional attempt metrics: %j',
          (event) => {
            expect(
              () => { assertAttemptProgress(
                  event,
                ); },
            ).not.toThrow();
          },
        );

        it.each([
          {
            durationMs: -1,
            hintsUsed: 0,
          },
          {
            durationMs: 1,
            hintsUsed: -1,
          },
          {
            durationMs: 1.5,
            hintsUsed: 0,
          },
          {
            durationMs: 1,
            hintsUsed: 0.5,
          },
        ])(
          'rejects invalid attempt metrics: %j',
          (event) => {
            expect(
              () => { assertAttemptProgress(
                  event,
                ); },
            ).toThrow(
              ProgressInvariantError,
            );
          },
        );
      },
    );
  },
);