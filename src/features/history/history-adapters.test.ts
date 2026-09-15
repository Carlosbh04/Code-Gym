import { describe, expect, it } from 'vitest';

import {
  adaptHistoryAttempt,
  adaptHistoryAttempts,
  adaptHistoryCompletedSession,
} from './history-adapters';

describe('history-adapters', () => {
  it('adapta un attempt sin fabricar answer ni stepType', () => {
    expect(
      adaptHistoryAttempt({
        id: 'attempt-1',
        sessionId: 'session-1',
        exerciseId: 'step-1',
        conceptId: 'concept-1',
        technologyId: 'javascript',
        isCorrect: true,
        attemptedAt: '2026-09-12T12:00:00.000Z',
        durationMs: 1500,
        hintsUsed: 1,
      }),
    ).toEqual({
      id: 'attempt-1',
      sessionId: 'session-1',
      stepId: 'step-1',
      isCorrect: true,
      timeSpentMs: 1500,
      hintsUsed: 1,
      createdAt: '2026-09-12T12:00:00.000Z',
    });
  });

  it('conserva durationMs e hintsUsed nulos', () => {
    expect(
      adaptHistoryAttempt({
        id: 'attempt-1',
        sessionId: 'session-1',
        exerciseId: 'step-1',
        conceptId: null,
        technologyId: 'javascript',
        isCorrect: false,
        attemptedAt: '2026-09-12T12:00:00.000Z',
        durationMs: null,
        hintsUsed: null,
      }),
    ).toMatchObject({
      timeSpentMs: null,
      hintsUsed: null,
    });
  });

  it('adapta colecciones de attempts', () => {
    expect(
      adaptHistoryAttempts([
        {
          id: 'attempt-1',
          sessionId: 'session-1',
          exerciseId: 'step-1',
          conceptId: null,
          technologyId: 'javascript',
          isCorrect: true,
          attemptedAt: '2026-09-12T12:00:00.000Z',
          durationMs: 1000,
          hintsUsed: 0,
        },
      ]),
    ).toHaveLength(1);
  });

  it('adapta completed session al modelo frontend', () => {
    expect(
      adaptHistoryCompletedSession({
        id: 'completion-1',
        sessionId: 'session-1',
        technologyId: 'javascript',
        topicId: 'arrays',
        conceptId: 'concept-1',
        totalExercises: 4,
        correctExercises: 3,
        accuracy: 0.75,
        durationMs: 12000,
        hintsUsed: 1,
        completedAt: '2026-09-12T12:00:00.000Z',
      }),
    ).toEqual({
      id: 'completion-1',
      sessionId: 'session-1',
      technologyId: 'javascript',
      conceptId: 'concept-1',
      totalSteps: 4,
      correctSteps: 3,
      accuracy: 75,
      timeSpentMs: 12000,
      completedAt: '2026-09-12T12:00:00.000Z',
    });
  });

  it('no fabrica conceptId cuando backend devuelve null', () => {
    expect(
      adaptHistoryCompletedSession({
        id: 'completion-1',
        sessionId: 'session-1',
        technologyId: 'javascript',
        topicId: null,
        conceptId: null,
        totalExercises: 1,
        correctExercises: 1,
        accuracy: 1,
        durationMs: 1000,
        hintsUsed: 0,
        completedAt: '2026-09-12T12:00:00.000Z',
      }),
    ).toBeNull();
  });
});
