import { describe, expect, it } from 'vitest';
import { StaticContentRepository } from '@/lib/repositories/StaticContentRepository';
import type { Difficulty, ExerciseSession, ExerciseStep } from '@/types/exercise';
import type { DomainImpact, UserAnswer } from '@/types/progress';
import { calculateScore } from './scoring';

const IMPACT: DomainImpact = { previousDomain: 40, newDomain: 55, change: 15 };

const step = (n: number): ExerciseStep => ({
  id: `step-${n}`,
  type: 'code-reading',
  prompt: `pregunta ${n}`,
  code: null,
  language: null,
  options: null,
  requirements: [],
  hintCount: 0,
  stepOrder: n,
});

const session = (steps: number, difficulty: Difficulty = 'beginner'): ExerciseSession => ({
  id: 'js-test-01',
  title: 'sesión de prueba',
  conceptId: 'js-test',
  technologyId: 'javascript',
  difficulty,
  version: '1.0.0',
  status: 'published',
  createdAt: '2026-09-01',
  updatedAt: null,
  steps: Array.from({ length: steps }, (_, i) => step(i + 1)),
});

const answer = (
  n: number,
  isCorrect: boolean,
  timeSpentMs = 0,
  hintsUsed = 0,
): UserAnswer => ({
  stepId: `step-${n}`,
  stepType: 'code-reading',
  answer: 'a',
  isCorrect,
  timeSpentMs,
  hintsUsed,
});

describe('calculateScore (T024)', () => {
  describe('accuracy = (correctSteps / totalSteps) * 100', () => {
    it('sesión normal: 3 de 4 correctas → 75', () => {
      const score = calculateScore(
        session(4),
        [answer(1, true), answer(2, true), answer(3, false), answer(4, true)],
        IMPACT,
      );

      expect(score.totalSteps).toBe(4);
      expect(score.correctSteps).toBe(3);
      expect(score.accuracy).toBe(75);
    });

    it('ninguna correcta → 0', () => {
      const score = calculateScore(
        session(4),
        [answer(1, false), answer(2, false), answer(3, false), answer(4, false)],
        IMPACT,
      );

      expect(score.correctSteps).toBe(0);
      expect(score.accuracy).toBe(0);
    });

    it('todas correctas → 100', () => {
      const score = calculateScore(
        session(4),
        [answer(1, true), answer(2, true), answer(3, true), answer(4, true)],
        IMPACT,
      );

      expect(score.correctSteps).toBe(4);
      expect(score.accuracy).toBe(100);
    });

    it('no redondea: 1 de 3 da el valor exacto de la fórmula', () => {
      const score = calculateScore(
        session(3),
        [answer(1, true), answer(2, false), answer(3, false)],
        IMPACT,
      );

      expect(score.accuracy).toBe((1 / 3) * 100);
      expect(score.accuracy).toBeCloseTo(33.3333, 4);
    });

    it('el denominador son los pasos, no las respuestas: 2 respuestas de 4 pasos', () => {
      const score = calculateScore(session(4), [answer(1, true), answer(2, false)], IMPACT);

      expect(score.totalSteps).toBe(4);
      expect(score.correctSteps).toBe(1);
      expect(score.accuracy).toBe(25);
    });

    it('sin respuestas y con pasos → 0', () => {
      const score = calculateScore(session(4), [], IMPACT);

      expect(score.correctSteps).toBe(0);
      expect(score.accuracy).toBe(0);
    });

    it('coincide con la fórmula para cada tamaño de 1 a 10', () => {
      for (let total = 1; total <= 10; total += 1) {
        for (let correct = 0; correct <= total; correct += 1) {
          const answers = Array.from({ length: total }, (_, i) => answer(i + 1, i < correct));
          const score = calculateScore(session(total), answers, IMPACT);

          expect(score.accuracy, `${correct}/${total}`).toBe((correct / total) * 100);
          expect(score.correctSteps).toBe(correct);
          expect(score.totalSteps).toBe(total);
        }
      }
    });
  });

  describe('caso borde: totalSteps === 0', () => {
    it('sin pasos ni respuestas → todo a cero, sin NaN', () => {
      const score = calculateScore(session(0), [], IMPACT);

      expect(score.totalSteps).toBe(0);
      expect(score.correctSteps).toBe(0);
      expect(score.accuracy).toBe(0);
      expect(Number.isNaN(score.accuracy)).toBe(false);
    });

    it('sin pasos pero con respuestas: accuracy sigue siendo 0', () => {
      const score = calculateScore(session(0), [answer(1, true), answer(2, true)], IMPACT);

      expect(score.correctSteps).toBe(2);
      expect(score.accuracy).toBe(0);
      expect(Number.isFinite(score.accuracy)).toBe(true);
    });
  });

  describe('acumulados', () => {
    it('timeSpentMs suma todas las respuestas', () => {
      const score = calculateScore(
        session(3),
        [answer(1, true, 1500), answer(2, false, 20_000), answer(3, true, 750)],
        IMPACT,
      );

      expect(score.timeSpentMs).toBe(22_250);
    });

    it('hintsUsed suma todas las respuestas', () => {
      const score = calculateScore(
        session(3),
        [answer(1, true, 0, 2), answer(2, false, 0, 0), answer(3, true, 0, 3)],
        IMPACT,
      );

      expect(score.hintsUsed).toBe(5);
    });

    it('sin respuestas, los acumulados son cero', () => {
      const score = calculateScore(session(4), [], IMPACT);

      expect(score.timeSpentMs).toBe(0);
      expect(score.hintsUsed).toBe(0);
    });

    it('las pistas no penalizan la precisión', () => {
      const sinPistas = calculateScore(session(2), [answer(1, true, 0, 0), answer(2, true, 0, 0)], IMPACT);
      const conPistas = calculateScore(session(2), [answer(1, true, 0, 5), answer(2, true, 0, 9)], IMPACT);

      expect(conPistas.accuracy).toBe(sinPistas.accuracy);
      expect(conPistas.hintsUsed).toBe(14);
    });
  });

  describe('domainImpact inyectado', () => {
    it('se devuelve tal cual, sin recalcularlo', () => {
      const score = calculateScore(session(2), [answer(1, true), answer(2, true)], IMPACT);

      expect(score.domainImpact).toBe(IMPACT);
      expect(score.domainImpact).toEqual({ previousDomain: 40, newDomain: 55, change: 15 });
    });

    it('acepta un impacto negativo sin alterarlo', () => {
      const bajada: DomainImpact = { previousDomain: 70, newDomain: 62, change: -8 };
      const score = calculateScore(session(2), [answer(1, false), answer(2, false)], bajada);

      expect(score.domainImpact).toBe(bajada);
      expect(score.accuracy).toBe(0);
    });
  });

  describe('la dificultad no interviene en la fórmula', () => {
    it('la misma sesión con distinta dificultad puntúa igual', () => {
      const answers = [answer(1, true), answer(2, false)];
      const resultados = (['beginner', 'intermediate', 'advanced'] as const).map((d) =>
        calculateScore(session(2, d), answers, IMPACT),
      );

      expect(resultados[0]).toEqual(resultados[1]);
      expect(resultados[1]).toEqual(resultados[2]);
      expect(resultados[0].accuracy).toBe(50);
    });
  });

  describe('pureza y determinismo', () => {
    it('no muta la sesión ni las respuestas', () => {
      const s = session(3);
      const answers = [answer(1, true, 100, 1), answer(2, false, 200, 0), answer(3, true, 300, 2)];
      const sAntes = JSON.stringify(s);
      const aAntes = JSON.stringify(answers);

      calculateScore(s, answers, IMPACT);

      expect(JSON.stringify(s)).toBe(sAntes);
      expect(JSON.stringify(answers)).toBe(aAntes);
    });

    it('la misma entrada produce siempre el mismo resultado', () => {
      const s = session(4);
      const answers = [answer(1, true, 10, 1), answer(2, false, 20, 0), answer(3, true, 30, 2)];

      expect(calculateScore(s, answers, IMPACT)).toEqual(calculateScore(s, answers, IMPACT));
    });

    it('devuelve un objeto nuevo en cada llamada', () => {
      const s = session(2);
      const answers = [answer(1, true), answer(2, true)];

      expect(calculateScore(s, answers, IMPACT)).not.toBe(calculateScore(s, answers, IMPACT));
    });

    it('expone exactamente los campos de SessionScore', () => {
      const score = calculateScore(session(1), [answer(1, true)], IMPACT);

      expect(Object.keys(score).sort()).toEqual([
        'accuracy',
        'correctSteps',
        'domainImpact',
        'hintsUsed',
        'timeSpentMs',
        'totalSteps',
      ]);
    });
  });

  describe('con una sesión real del contenido', () => {
    it('puntúa una sesión de T017 con sus 4 pasos', async () => {
      const real = await new StaticContentRepository().getSessionById(
        'js-arrays-map-vs-foreach-01',
      );
      const answers = real!.steps.map((s, i) => ({
        stepId: s.id,
        stepType: s.type,
        answer: 'a',
        isCorrect: i < 3,
        timeSpentMs: 1000 * (i + 1),
        hintsUsed: i,
      }));

      const score = calculateScore(real!, answers, IMPACT);

      expect(score.totalSteps).toBe(4);
      expect(score.correctSteps).toBe(3);
      expect(score.accuracy).toBe(75);
      expect(score.timeSpentMs).toBe(10_000);
      expect(score.hintsUsed).toBe(6);
    });
  });
});
