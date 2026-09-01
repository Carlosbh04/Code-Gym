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

/** Primera línea real del código que NO está declarada en errorLines. */
const wrongLineOf = (step: ExerciseStep) => {
  const total = step.code!.split('\n').length;
  for (let line = 1; line <= total; line++) {
    if (!step.errorLines!.includes(line)) return line;
  }
  throw new Error('el paso declara todas sus líneas como erróneas');
};

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

  describe('find-error: línea + tipo contra errorLines + errorType (D014)', () => {
    const SESSION = 'js-arrays-filter-mutation-01';

    it('acepta línea correcta + tipo correcto', async () => {
      const step = await stepOfType(SESSION, 'find-error');

      const result = validateSelection(step, {
        line: step.errorLines![0],
        errorType: step.errorType!,
      });

      expect(result.isCorrect).toBe(true);
      expect(result.explanation).toBe(step.explanation);
    });

    it('rechaza línea correcta + tipo incorrecto', async () => {
      const step = await stepOfType(SESSION, 'find-error');

      for (const otro of ['logico', 'flujo', 'scope', 'tipo', '']) {
        if (otro === step.errorType) continue;
        expect(
          validateSelection(step, { line: step.errorLines![0], errorType: otro }).isCorrect,
          otro,
        ).toBe(false);
      }
    });

    it('rechaza línea incorrecta + tipo correcto', async () => {
      const step = await stepOfType(SESSION, 'find-error');

      expect(
        validateSelection(step, {
          line: wrongLineOf(step),
          errorType: step.errorType!,
        }).isCorrect,
      ).toBe(false);
    });

    it('rechaza línea incorrecta + tipo incorrecto', async () => {
      const step = await stepOfType(SESSION, 'find-error');

      expect(
        validateSelection(step, { line: wrongLineOf(step), errorType: 'scope' }).isCorrect,
      ).toBe(false);
    });

    it('rechaza cualquier línea fuera de errorLines, incluidas las que no existen', async () => {
      const step = await stepOfType(SESSION, 'find-error');
      const total = step.code!.split('\n').length;

      for (let line = -1; line <= total + 2; line++) {
        if (step.errorLines!.includes(line)) continue;
        expect(
          validateSelection(step, { line, errorType: step.errorType! }).isCorrect,
          'línea ' + line,
        ).toBe(false);
      }
    });

    it('no hay crédito parcial: solo acierta la combinación completa', async () => {
      const step = await stepOfType(SESSION, 'find-error');
      const buena = { line: step.errorLines![0], errorType: step.errorType! };
      const mala = { line: wrongLineOf(step), errorType: 'scope' };

      const combinaciones = [
        [{ ...buena }, true],
        [{ line: buena.line, errorType: mala.errorType }, false],
        [{ line: mala.line, errorType: buena.errorType }, false],
        [{ ...mala }, false],
      ] as const;

      for (const [answer, esperado] of combinaciones) {
        expect(validateSelection(step, answer).isCorrect, JSON.stringify(answer)).toBe(
          esperado,
        );
      }
    });

    it('soporta pasos con varias líneas erróneas: vale cualquiera de ellas', async () => {
      const base = await stepOfType(SESSION, 'find-error');
      const variasLineas: ExerciseStep = { ...base, errorLines: [2, 3, 5] };

      for (const line of [2, 3, 5]) {
        expect(
          validateSelection(variasLineas, { line, errorType: base.errorType! }).isCorrect,
          'línea ' + line,
        ).toBe(true);
      }

      for (const line of [1, 4, 6]) {
        expect(
          validateSelection(variasLineas, { line, errorType: base.errorType! }).isCorrect,
          'línea ' + line,
        ).toBe(false);
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
        expect(
          validateSelection(step, {
            line: step.errorLines![0],
            errorType: correctIdOf(step),
          }).isCorrect,
          sessionId,
        ).toBe(true);
      }
    });

    it('las líneas declaradas existen dentro del código del paso', async () => {
      for (const sessionId of [
        'js-arrays-map-vs-foreach-01',
        'js-arrays-filter-mutation-01',
        'js-arrays-reduce-accumulator-01',
        'js-functions-default-parameters-01',
        'js-functions-scope-hoisting-01',
        'js-functions-return-flow-01',
      ]) {
        const step = await stepOfType(sessionId, 'find-error');
        const total = step.code!.split('\n').length;

        expect(step.errorLines!.length, sessionId).toBeGreaterThan(0);
        for (const line of step.errorLines!) {
          expect(line, sessionId).toBeGreaterThanOrEqual(1);
          expect(line, sessionId).toBeLessThanOrEqual(total);
        }
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

      expect(() =>
        validateSelection(sinTipo, { line: 1, errorType: 'conceptual' }),
      ).toThrow(/no declara errorType/);
    });

    it('lanza si un find-error no declara errorLines', async () => {
      const base = await stepOfType('js-arrays-filter-mutation-01', 'find-error');

      for (const errorLines of [null, []]) {
        const sinLineas: ExerciseStep = { ...base, errorLines };
        expect(() =>
          validateSelection(sinLineas, { line: 1, errorType: base.errorType! }),
        ).toThrow(/no declara errorLines/);
      }
    });

    it('lanza si un find-error recibe una respuesta que no es compuesta', async () => {
      const step = await stepOfType('js-arrays-filter-mutation-01', 'find-error');

      for (const answer of [step.errorType!, 3]) {
        expect(() => validateSelection(step, answer)).toThrow(
          /se responde con \{ line, errorType \}/,
        );
      }
    });

    it('lanza si un paso de opción recibe la respuesta compuesta de find-error', async () => {
      const step = await stepOfType('js-arrays-map-vs-foreach-01', 'code-reading');

      expect(() =>
        validateSelection(step, { line: 1, errorType: 'conceptual' }),
      ).toThrow(/se responde con el id de una opción/);
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
