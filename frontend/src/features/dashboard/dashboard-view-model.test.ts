import { describe, expect, it } from 'vitest';
import type { ExerciseSession, ExerciseStep } from '@/types/exercise';
import type { ConceptProgress } from '@/types/progress';
import {
  calculateAccuracy,
  createDashboardVerdict,
  createDashboardViewModel,
  getDashboardStatus,
  getEvidenceLevel,
  selectCodePiece,
  selectRecommendedSession,
} from './dashboard-view-model';

const progressOf = (
  conceptId: string,
  totalAttempts: number,
  correctAttempts: number,
  lastPracticed = '2026-09-01T10:00:00.000Z',
  domain = 0,
): ConceptProgress => ({
  conceptId,
  domain,
  totalAttempts,
  correctAttempts,
  difficultyDistribution: {
    beginner: { total: totalAttempts, correct: correctAttempts },
    intermediate: { total: 0, correct: 0 },
    advanced: { total: 0, correct: 0 },
  },
  recentErrors: [],
  lastPracticed,
  schemaVersion: 1,
});

const stepOf = (
  id: string,
  type: ExerciseStep['type'],
  code: string | null,
): ExerciseStep => ({
  id,
  type,
  prompt: id,
  code,
  language: code === null ? null : 'javascript',
  options: null,
  requirements: [],
  hintCount: 0,
  stepOrder: 1,
});

const sessionOf = (
  id: string,
  steps: ExerciseStep[],
): ExerciseSession => ({
  id,
  title: id,
  conceptId: 'concept-a',
  technologyId: 'javascript',
  difficulty: 'beginner',
  version: '1.0.0',
  status: 'published',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: null,
  steps,
});

describe('dashboard view model (T055)', () => {
  it('no calcula accuracy cuando no existen respuestas y redondea cuando existen', () => {
    expect(calculateAccuracy(0, 0)).toBeUndefined();
    expect(calculateAccuracy(2, 3)).toBe(67);
  });

  it.each([
    [0, 'none'],
    [1, 'initial'],
    [4, 'initial'],
    [5, 'sufficient'],
  ] as const)('clasifica %i respuestas como evidencia %s', (attempts, expected) => {
    expect(getEvidenceLevel(attempts)).toBe(expected);
  });

  it.each([
    [59, 'improvement'],
    [60, 'attention'],
    [79, 'attention'],
    [80, 'ok'],
  ] as const)('clasifica accuracy %i como %s', (accuracy, expected) => {
    expect(getDashboardStatus(accuracy, 'sufficient')).toBe(expected);
  });

  it('no asigna status sin evidencia suficiente', () => {
    expect(getDashboardStatus(100, 'initial')).toBeUndefined();
    expect(getDashboardStatus(undefined, 'none')).toBeUndefined();
  });

  it('distingue empty, early y full en los límites autorizados', () => {
    expect(createDashboardViewModel([]).state).toBe('empty');
    expect(createDashboardViewModel([progressOf('a', 1, 1)]).state).toBe('early');
    expect(createDashboardViewModel([progressOf('a', 4, 4)]).state).toBe('early');
    expect(createDashboardViewModel([progressOf('a', 5, 4)]).state).toBe('full');
  });

  it('selecciona prioridad por menor accuracy, fecha más antigua e id', () => {
    const model = createDashboardViewModel([
      progressOf('z', 10, 7, '2026-09-01T00:00:00.000Z'),
      progressOf('b', 10, 5, '2026-09-02T00:00:00.000Z'),
      progressOf('c', 10, 5, '2026-09-01T00:00:00.000Z'),
      progressOf('a', 10, 5, '2026-09-01T00:00:00.000Z'),
    ]);

    expect(model.priorityConcept?.conceptId).toBe('a');
    expect(model.otherConcepts.map((item) => item.conceptId)).toEqual([
      'c',
      'b',
      'z',
    ]);
  });

  it('ordena otros conceptos por MEJORA, ATENCIÓN, OK y después por prioridad', () => {
    const model = createDashboardViewModel([
      progressOf('priority', 10, 1),
      progressOf('ok', 10, 9),
      progressOf('attention', 10, 7),
      progressOf('improvement-b', 10, 5, '2026-09-02T00:00:00.000Z'),
      progressOf('improvement-a', 10, 5, '2026-09-01T00:00:00.000Z'),
    ]);

    expect(model.otherConcepts.map((item) => item.conceptId)).toEqual([
      'improvement-a',
      'improvement-b',
      'attention',
      'ok',
    ]);
  });

  it('produce un verdict positivo cuando todos los conceptos suficientes están OK', () => {
    const model = createDashboardViewModel([
      progressOf('arrays', 10, 8),
      progressOf('functions', 10, 9),
    ]);
    const verdict = createDashboardVerdict(model, 'Arrays');

    expect(verdict.status).toBe('ok');
    expect(verdict.headline).toContain('progreso es sólido');
    expect(verdict.headline).toContain('consolidando Arrays');
    expect(verdict.headline).not.toMatch(/debilidad|problema|error/i);
  });

  it('calcula agregados honestos y conserva conceptos iniciales sin status', () => {
    const model = createDashboardViewModel([
      progressOf('a', 3, 2, '2026-09-01T00:00:00.000Z', 99),
      {
        ...progressOf('b', 5, 3, '2026-09-03T00:00:00.000Z', 1),
        recentErrors: [
          {
            stepType: 'find-error',
            errorType: 'mutacion',
            timestamp: '2026-09-03T00:00:00.000Z',
            sessionId: 'session-b',
          },
        ],
      },
    ]);

    expect(model.overview).toEqual({
      totalAnswers: 8,
      totalCorrect: 5,
      globalAccuracy: 63,
      conceptsPracticed: 2,
      lastPracticed: '2026-09-03T00:00:00.000Z',
    });
    expect(model.observedConcepts).toHaveLength(1);
    expect(model.observedConcepts[0]?.status).toBeUndefined();
    expect(model.priorityConcept?.conceptId).toBe('b');
  });

  it('ignora domain y recentErrors al elegir y clasificar', () => {
    const lowDomain = {
      ...progressOf('low-domain', 10, 9, '2026-09-01T00:00:00.000Z', 1),
      recentErrors: [
        {
          stepType: 'find-error',
          errorType: 'logico',
          timestamp: '2026-09-01T00:00:00.000Z',
          sessionId: 's',
        },
      ],
    };
    const highDomain = progressOf(
      'high-domain',
      10,
      5,
      '2026-09-02T00:00:00.000Z',
      100,
    );

    const model = createDashboardViewModel([lowDomain, highDomain]);
    expect(model.priorityConcept?.conceptId).toBe('high-domain');
    expect(model.priorityConcept?.status).toBe('improvement');
  });

  it('prefiere sesión find-error con código y preserva el orden recibido', () => {
    const noCode = sessionOf('first', [stepOf('a', 'code-reading', null)]);
    const regularCode = sessionOf('second', [stepOf('b', 'code-reading', '1 + 1')]);
    const findError = sessionOf('third', [stepOf('c', 'find-error', 'const x = 1')]);

    expect(selectRecommendedSession([noCode, regularCode, findError])).toBe(findError);
    expect(selectRecommendedSession([regularCode, findError])).toBe(findError);
  });

  it('aplica fallbacks de sesión con código, primera sesión y ausencia', () => {
    const noCode = sessionOf('first', [stepOf('a', 'code-reading', null)]);
    const regularCode = sessionOf('second', [stepOf('b', 'code-reading', '1 + 1')]);

    expect(selectRecommendedSession([noCode, regularCode])).toBe(regularCode);
    expect(selectRecommendedSession([noCode])).toBe(noCode);
    expect(selectRecommendedSession([])).toBeNull();
  });

  it('elige el primer find-error con código y después el primer código', () => {
    const regular = stepOf('regular', 'code-reading', 'const a = 1');
    const findWithoutCode = stepOf('empty-find', 'find-error', null);
    const findWithCode = stepOf('find', 'find-error', 'const b = 2');

    expect(selectCodePiece(sessionOf('a', [regular, findWithoutCode, findWithCode]))).toBe(
      findWithCode,
    );
    expect(selectCodePiece(sessionOf('b', [findWithoutCode, regular]))).toBe(regular);
    expect(selectCodePiece(sessionOf('c', [findWithoutCode]))).toBeNull();
  });
});
