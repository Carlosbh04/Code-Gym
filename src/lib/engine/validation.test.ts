import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { StaticContentRepository } from '@/lib/repositories/StaticContentRepository';
import type { ExerciseStep, StepAnswer } from '@/types/exercise';
import { isFindErrorAnswer, validateSelection } from './validation';

const ALL_SESSIONS = [
  'js-arrays-filter-mutation-01',
  'js-arrays-map-vs-foreach-01',
  'js-arrays-reduce-accumulator-01',
  'js-functions-default-parameters-01',
  'js-functions-return-flow-01',
  'js-functions-scope-hoisting-01',
];

/** La respuesta que acierta un paso, según su tipo (D014). */
const correctAnswerFor = (step: ExerciseStep): StepAnswer =>
  step.type === 'find-error'
    ? { line: step.errorLines![0], errorType: step.errorType! }
    : step.options!.find((o) => o.correct)!.id;

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

  describe('T037 · isFindErrorAnswer distingue la forma compuesta', () => {
    it('acepta la forma { line: number, errorType: string }', () => {
      expect(isFindErrorAnswer({ line: 3, errorType: 'mutacion' })).toBe(true);
      expect(isFindErrorAnswer({ line: 0, errorType: '' })).toBe(true);
    });

    it('rechaza los escalares que StepAnswer también admite', () => {
      expect(isFindErrorAnswer('conceptual')).toBe(false);
      expect(isFindErrorAnswer(3)).toBe(false);
    });

    it('rechaza null, que en JavaScript también es "object"', () => {
      expect(isFindErrorAnswer(null as unknown as StepAnswer)).toBe(false);
    });

    it('rechaza una línea que no es número', () => {
      expect(isFindErrorAnswer({ line: '3', errorType: 'x' } as unknown as StepAnswer)).toBe(
        false,
      );
      expect(isFindErrorAnswer({ errorType: 'x' } as unknown as StepAnswer)).toBe(false);
    });

    it('rechaza un invocable aunque lleve line y errorType', () => {
      // De esto defiende la comprobación de `typeof answer === 'object'`: un
      // string o un number ya caen en el chequeo de `line`, pero una función
      // con las dos propiedades pasaría todo lo demás. `StepAnswer` no lo
      // permite; `isFindErrorAnswer` está exportada y sí puede recibirlo.
      const invocable = Object.assign(() => {}, { line: 3, errorType: 'mutacion' });

      expect(isFindErrorAnswer(invocable as unknown as StepAnswer)).toBe(false);
    });

    it('un invocable tampoco se acepta como respuesta de find-error', async () => {
      const step = await stepOfType('js-arrays-filter-mutation-01', 'find-error');
      const invocable = Object.assign(() => {}, {
        line: step.errorLines![0],
        errorType: step.errorType!,
      });

      expect(() => validateSelection(step, invocable as unknown as StepAnswer)).toThrow(
        /se responde con \{ line, errorType \}/,
      );
    });

    it('rechaza un tipo de error que no es cadena', () => {
      expect(isFindErrorAnswer({ line: 3, errorType: 3 } as unknown as StepAnswer)).toBe(
        false,
      );
      expect(isFindErrorAnswer({ line: 3 } as unknown as StepAnswer)).toBe(false);
    });
  });

  describe('T037 · ramas de matchesCorrectOption', () => {
    it('acepta cualquiera de las opciones cuando el paso declara varias correctas', async () => {
      const base = await stepOfType('js-arrays-map-vs-foreach-01', 'code-reading');
      const dosCorrectas: ExerciseStep = {
        ...base,
        options: base.options!.map((o, i) => ({ ...o, correct: i === 0 || i === 2 })),
      };

      expect(validateSelection(dosCorrectas, base.options![0].id).isCorrect).toBe(true);
      expect(validateSelection(dosCorrectas, base.options![2].id).isCorrect).toBe(true);
      expect(validateSelection(dosCorrectas, base.options![1].id).isCorrect).toBe(false);
      expect(validateSelection(dosCorrectas, base.options![3].id).isCorrect).toBe(false);
    });

    it('una lista de opciones vacía no tiene ninguna correcta', async () => {
      const base = await stepOfType('js-arrays-map-vs-foreach-01', 'code-reading');
      const sinNinguna: ExerciseStep = { ...base, options: [] };

      expect(() => validateSelection(sinNinguna, 'a')).toThrow(/ninguna opción correcta/);
    });

    it('un número tampoco es un id de opción, aunque StepAnswer lo admita', async () => {
      for (const type of ['code-reading', 'predict-output'] as const) {
        const step = await stepOfType('js-arrays-map-vs-foreach-01', type);

        expect(() => validateSelection(step, 3)).toThrow(
          /se responde con el id de una opción/,
        );
      }
    });

    it('null no es un id de opción', async () => {
      const step = await stepOfType('js-arrays-map-vs-foreach-01', 'code-reading');

      expect(() => validateSelection(step, null as unknown as StepAnswer)).toThrow(
        /se responde con el id de una opción/,
      );
    });

    it('la cadena vacía es un id como cualquier otro: simplemente no acierta', async () => {
      const step = await stepOfType('js-arrays-map-vs-foreach-01', 'code-reading');

      expect(validateSelection(step, '').isCorrect).toBe(false);
    });
  });

  describe('T037 · ramas de matchesError', () => {
    it('null se rechaza como respuesta de find-error', async () => {
      const step = await stepOfType('js-arrays-filter-mutation-01', 'find-error');

      expect(() => validateSelection(step, null as unknown as StepAnswer)).toThrow(
        /se responde con \{ line, errorType \}/,
      );
    });

    it('una respuesta a medias no vale como compuesta', async () => {
      const step = await stepOfType('js-arrays-filter-mutation-01', 'find-error');
      const aMedias = [
        { line: 3 },
        { errorType: 'mutacion' },
        { line: '3', errorType: 'mutacion' },
        { line: 3, errorType: 7 },
        {},
      ];

      for (const answer of aMedias) {
        expect(
          () => validateSelection(step, answer as unknown as StepAnswer),
          JSON.stringify(answer),
        ).toThrow(/se responde con \{ line, errorType \}/);
      }
    });

    it('errorLines se comprueba antes que errorType', async () => {
      const base = await stepOfType('js-arrays-filter-mutation-01', 'find-error');
      const sinNada: ExerciseStep = { ...base, errorLines: null, errorType: null };

      // Con las dos ausencias, manda la primera guarda.
      expect(() => validateSelection(sinNada, { line: 1, errorType: 'x' })).toThrow(
        /no declara errorLines/,
      );
    });

    it('un errorType vacío es un tipo declarado, no una ausencia', async () => {
      const base = await stepOfType('js-arrays-filter-mutation-01', 'find-error');
      const tipoVacio: ExerciseStep = { ...base, errorType: '' };
      const linea = base.errorLines![0];

      expect(validateSelection(tipoVacio, { line: linea, errorType: '' }).isCorrect).toBe(
        true,
      );
      expect(
        validateSelection(tipoVacio, { line: linea, errorType: 'mutacion' }).isCorrect,
      ).toBe(false);
    });

    it('una línea decimal no coincide con la declarada', async () => {
      const step = await stepOfType('js-arrays-filter-mutation-01', 'find-error');
      const linea = step.errorLines![0];

      expect(
        validateSelection(step, { line: linea + 0.5, errorType: step.errorType! }).isCorrect,
      ).toBe(false);
    });
  });

  describe('T037 · fix-code no se valida aquí', () => {
    it('lanza sea cual sea la forma de la respuesta', async () => {
      const step = await stepOfType('js-arrays-map-vs-foreach-01', 'fix-code');
      const respuestas: StepAnswer[] = [
        'const x = 1;',
        3,
        { line: 1, errorType: 'logico' },
      ];

      for (const answer of respuestas) {
        expect(() => validateSelection(step, answer)).toThrow(/corresponde al Worker/);
      }
    });

    it('el error nombra al Worker, que es quien tiene esa responsabilidad', async () => {
      const step = await stepOfType('js-arrays-map-vs-foreach-01', 'fix-code');

      expect(() => validateSelection(step, 'x')).toThrow(
        new RegExp(`El paso ${step.id} es fix-code`),
      );
    });

    it('lanza antes de mirar el paso: ni siquiera necesita testCases', async () => {
      const base = await stepOfType('js-arrays-map-vs-foreach-01', 'fix-code');
      const roto: ExerciseStep = { ...base, testCases: null, options: null };

      expect(() => validateSelection(roto, 'x')).toThrow(/corresponde al Worker/);
    });

    it('los 6 pasos fix-code del contenido real se rechazan igual', async () => {
      for (const id of ALL_SESSIONS) {
        const step = (await stepsOf(id)).find((s) => s.type === 'fix-code')!;

        expect(() => validateSelection(step, 'lo que sea'), id).toThrow(
          /corresponde al Worker/,
        );
      }
    });
  });

  describe('T037 · el contenido real completo', () => {
    it('los 18 pasos validables aciertan con su respuesta correcta', async () => {
      let validados = 0;

      for (const id of ALL_SESSIONS) {
        for (const step of await stepsOf(id)) {
          if (step.type === 'fix-code') continue;

          const result = validateSelection(step, correctAnswerFor(step));

          expect(result.isCorrect, `${id}/${step.id}`).toBe(true);
          expect(result.explanation, `${id}/${step.id}`).toBe(step.explanation);
          validados += 1;
        }
      }

      expect(validados).toBe(18);
    });

    it('y fallan con cada una de sus respuestas incorrectas', async () => {
      let rechazadas = 0;

      for (const id of ALL_SESSIONS) {
        for (const step of await stepsOf(id)) {
          if (step.type === 'fix-code') continue;

          for (const option of step.options!) {
            if (option.correct) continue;

            const answer: StepAnswer =
              step.type === 'find-error'
                ? { line: step.errorLines![0], errorType: option.id }
                : option.id;

            expect(
              validateSelection(step, answer).isCorrect,
              `${id}/${step.id}/${option.id}`,
            ).toBe(false);
            rechazadas += 1;
          }
        }
      }

      expect(rechazadas).toBe(54);
    });

    it('cada paso validable declara exactamente una opción correcta', async () => {
      for (const id of ALL_SESSIONS) {
        for (const step of await stepsOf(id)) {
          if (step.type === 'fix-code') continue;

          expect(step.options!.filter((o) => o.correct), `${id}/${step.id}`).toHaveLength(1);
        }
      }
    });
  });

  describe('T037 · seguridad: la validación es aritmética, no ejecución', () => {
    // Bajo jsdom, import.meta.url no es file://: se lee desde la raíz del
    // proyecto, que es el cwd con el que corre Vitest.
    const source = readFileSync('src/lib/engine/validation.ts', 'utf8');

    it.each([
      ['eval', /\beval\s*\(/],
      ['new Function', /new\s+Function\s*\(/],
      ['Worker', /new\s+Worker\s*\(/],
      ['DOM', /\bdocument\.|\bwindow\./],
      ['almacenamiento', /localStorage|sessionStorage|indexedDB/],
      ['red', /\bfetch\s*\(|XMLHttpRequest|WebSocket/],
      ['import dinámico', /\bimport\s*\(/],
    ])('el módulo no contiene %s', (_nombre, patron) => {
      expect(source).not.toMatch(patron);
    });

    it('no ejecuta el código de ningún paso, ni toca red o almacenamiento', async () => {
      const log = vi.spyOn(console, 'log').mockImplementation(() => {});
      const fetchSpy = vi.fn();
      const storageSpy = vi.spyOn(Storage.prototype, 'getItem');
      const original = globalThis.fetch;
      globalThis.fetch = fetchSpy as unknown as typeof fetch;

      let conCodigo = 0;

      for (const id of ALL_SESSIONS) {
        for (const step of await stepsOf(id)) {
          if (step.code !== null) conCodigo += 1;
          if (step.type === 'fix-code') continue;
          validateSelection(step, correctAnswerFor(step));
        }
      }

      expect(conCodigo).toBeGreaterThan(0);
      expect(log).not.toHaveBeenCalled();
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(storageSpy).not.toHaveBeenCalled();

      globalThis.fetch = original;
      storageSpy.mockRestore();
      log.mockRestore();
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
