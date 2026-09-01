import { describe, expect, it } from 'vitest';
import { StaticContentRepository } from '@/lib/repositories/StaticContentRepository';
import type { ExerciseStep } from '@/types/exercise';
import { validateSelection } from './validation';

const repo = new StaticContentRepository();
const stepsOf = async (sessionId: string) =>
  (await repo.getSessionById(sessionId))!.steps;

const stepOfType = async (sessionId: string, type: ExerciseStep['type']) =>
  (await stepsOf(sessionId)).find((s) => s.type === type)!;

const correctIdOf = (step: ExerciseStep) =>
  step.options!.find((o) => o.correct)!.id;

describe('validateSelection (T023)', () => {
  describe('code-reading: optionId contra la opción correcta', () => {
    it('acepta la opción correcta', async () => {
      const step = await stepOfType('js-arrays-map-vs-foreach-01', 'code-reading');

      const result = validateSelection(step, correctIdOf(step));

      expect(result.isCorrect).toBe(true);
      expect(result.explanation).toBe(step.explanation);
    });

    it('rechaza cada una de las opciones incorrectas', async () => {
      const step = await stepOfType('js-arrays-map-vs-foreach-01', 'code-reading');
      const wrong = step.options!.filter((o) => !o.correct);

      expect(wrong.length).toBeGreaterThan(0);
      for (const option of wrong) {
        expect(validateSelection(step, option.id).isCorrect).toBe(false);
      }
    });

    it('rechaza un id que no está entre las opciones', async () => {
      const step = await stepOfType('js-arrays-map-vs-foreach-01', 'code-reading');

      expect(validateSelection(step, 'zzz').isCorrect).toBe(false);
      expect(validateSelection(step, '').isCorrect).toBe(false);
    });

    it('distingue mayúsculas en el identificador', async () => {
      const step = await stepOfType('js-arrays-map-vs-foreach-01', 'code-reading');

      expect(validateSelection(step, correctIdOf(step).toUpperCase()).isCorrect).toBe(false);
    });
  });

  describe('predict-output: misma regla que code-reading', () => {
    it('acepta la correcta y rechaza las demás', async () => {
      const step = await stepOfType('js-functions-default-parameters-01', 'predict-output');

      expect(validateSelection(step, correctIdOf(step)).isCorrect).toBe(true);
      for (const option of step.options!.filter((o) => !o.correct)) {
        expect(validateSelection(step, option.id).isCorrect).toBe(false);
      }
    });
  });

  describe('find-error: tipo contra errorType', () => {
    it('acepta el errorType declarado por el paso', async () => {
      const step = await stepOfType('js-arrays-filter-mutation-01', 'find-error');

      expect(step.errorType).not.toBeNull();
      expect(validateSelection(step, step.errorType!).isCorrect).toBe(true);
    });

    it('rechaza cualquier otro tipo de error', async () => {
      const step = await stepOfType('js-arrays-filter-mutation-01', 'find-error');

      for (const otro of ['logico', 'flujo', 'scope', 'tipo', '']) {
        if (otro === step.errorType) continue;
        expect(validateSelection(step, otro).isCorrect).toBe(false);
      }
    });

    it('el contenido mantiene errorType alineado con la opción correcta', async () => {
      for (const sessionId of [
        'js-arrays-map-vs-foreach-01',
        'js-arrays-filter-mutation-01',
        'js-arrays-reduce-accumulator-01',
        'js-functions-default-parameters-01',
        'js-functions-scope-hoisting-01',
        'js-functions-return-flow-01',
      ]) {
        const step = await stepOfType(sessionId, 'find-error');
        expect(correctIdOf(step), sessionId).toBe(step.errorType);
        expect(validateSelection(step, correctIdOf(step)).isCorrect).toBe(true);
      }
    });
  });

  describe('la explicación se devuelve siempre', () => {
    it('acompaña tanto al acierto como al fallo', async () => {
      const step = await stepOfType('js-functions-return-flow-01', 'code-reading');

      expect(validateSelection(step, correctIdOf(step)).explanation).toBe(step.explanation);
      expect(validateSelection(step, 'zzz').explanation).toBe(step.explanation);
    });
  });

  describe('entradas que no se pueden validar', () => {
    it('rechaza validar un paso fix-code: su validación es del Worker', async () => {
      const step = await stepOfType('js-arrays-map-vs-foreach-01', 'fix-code');

      expect(() => validateSelection(step, 'lo-que-sea')).toThrow(/fix-code/);
      expect(() => validateSelection(step, 'lo-que-sea')).toThrow(/Worker/);
    });

    it('lanza si un paso de opción múltiple no declara opciones', async () => {
      const base = await stepOfType('js-arrays-map-vs-foreach-01', 'code-reading');
      const sinOpciones: ExerciseStep = { ...base, options: null };

      expect(() => validateSelection(sinOpciones, 'a')).toThrow(/no declara opciones/);
    });

    it('lanza si ninguna opción está marcada como correcta', async () => {
      const base = await stepOfType('js-arrays-map-vs-foreach-01', 'code-reading');
      const sinCorrecta: ExerciseStep = {
        ...base,
        options: base.options!.map((o) => ({ ...o, correct: false })),
      };

      expect(() => validateSelection(sinCorrecta, 'a')).toThrow(/ninguna opción correcta/);
    });

    it('lanza si un find-error no declara errorType', async () => {
      const base = await stepOfType('js-arrays-filter-mutation-01', 'find-error');
      const sinTipo: ExerciseStep = { ...base, errorType: null };

      expect(() => validateSelection(sinTipo, 'conceptual')).toThrow(/no declara errorType/);
    });
  });

  describe('pureza', () => {
    it('no muta el paso recibido', async () => {
      const step = await stepOfType('js-arrays-map-vs-foreach-01', 'code-reading');
      const antes = JSON.stringify(step);

      validateSelection(step, correctIdOf(step));
      validateSelection(step, 'zzz');

      expect(JSON.stringify(step)).toBe(antes);
    });

    it('es determinista: la misma entrada da el mismo resultado', async () => {
      const step = await stepOfType('js-functions-scope-hoisting-01', 'predict-output');

      expect(validateSelection(step, correctIdOf(step))).toEqual(
        validateSelection(step, correctIdOf(step)),
      );
    });
  });
});
