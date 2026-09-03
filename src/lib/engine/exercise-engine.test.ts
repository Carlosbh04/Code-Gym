import { beforeEach, describe, expect, it } from 'vitest';
import { StaticContentRepository } from '@/lib/repositories/StaticContentRepository';
import type { ICodeExecutor } from '@/lib/executor/ICodeExecutor';
import type { ExecutionResult, TestCaseResult } from '@/lib/executor/types';
import type { ExerciseSession, ExerciseStep, StepAnswer, TestCase } from '@/types/exercise';
import type { IContentRepository } from '@/types/repository';
import { ExerciseEngine } from './exercise-engine';
import { validateSelection } from './validation';

/**
 * Executor de prueba: implementa el contrato completo de ICodeExecutor,
 * devuelve ExecutionResult bien formados según D016 y registra lo que recibe.
 * No evalúa código —eso solo ocurre en el Worker— y por eso la ejecución real
 * de punta a punta se comprueba en navegador, no aquí.
 */
class FakeExecutor implements ICodeExecutor {
  llamadas: Array<{ code: string; testCases: TestCase[] }> = [];
  destruido = false;
  private desenlace: { tipo: 'resuelve'; result: ExecutionResult } | { tipo: 'rechaza'; error: Error } =
    { tipo: 'resuelve', result: { pass: true, results: [] } };

  /** Todos los casos pasan. */
  pasaTodo(testCases: TestCase[]): void {
    this.desenlace = {
      tipo: 'resuelve',
      result: {
        pass: true,
        results: testCases.map((t) => ({
          input: t.input,
          expected: t.expected,
          actual: t.expected,
          pass: true,
        })),
      },
    };
  }

  /** Devuelve resultados concretos, para casos mixtos o con error. */
  devuelve(results: TestCaseResult[]): void {
    this.desenlace = {
      tipo: 'resuelve',
      result: { pass: results.every((r) => r.pass), results },
    };
  }

  /** El executor rechaza: timeout, caída del worker o destroy. */
  rechaza(mensaje: string): void {
    this.desenlace = { tipo: 'rechaza', error: new Error(mensaje) };
  }

  execute(code: string, testCases: TestCase[]): Promise<ExecutionResult> {
    this.llamadas.push({ code, testCases });

    return this.desenlace.tipo === 'rechaza'
      ? Promise.reject(this.desenlace.error)
      : Promise.resolve(this.desenlace.result);
  }

  destroy(): void {
    this.destruido = true;
  }
}

const ALL_SESSIONS = [
  'js-arrays-filter-mutation-01',
  'js-arrays-map-vs-foreach-01',
  'js-arrays-reduce-accumulator-01',
  'js-functions-default-parameters-01',
  'js-functions-return-flow-01',
  'js-functions-scope-hoisting-01',
];

describe('ExerciseEngine (T023)', () => {
  let repo: IContentRepository;
  let engine: ExerciseEngine;

  let executor: FakeExecutor;

  const fixCodeStepOf = async (sessionId: string): Promise<ExerciseStep> =>
    (await engine.loadSession(sessionId)).steps.find((step) => step.type === 'fix-code')!;

  beforeEach(() => {
    repo = new StaticContentRepository();
    executor = new FakeExecutor();
    engine = new ExerciseEngine(repo, executor);
  });

  describe('loadSession', () => {
    it('carga una sesión real a través del repositorio', async () => {
      const session = await engine.loadSession('js-arrays-map-vs-foreach-01');

      expect(session.id).toBe('js-arrays-map-vs-foreach-01');
      expect(session.conceptId).toBe('js-array-iteration');
      expect(session.steps).toHaveLength(4);
    });

    it('carga las 6 sesiones del contenido', async () => {
      for (const id of ALL_SESSIONS) {
        const session = await engine.loadSession(id);
        expect(session.id, id).toBe(id);
      }
    });

    it('lanza cuando la sesión no existe: §24 la tipa como no nulable', async () => {
      await expect(engine.loadSession('js-no-existe-99')).rejects.toThrow(
        'Sesión no encontrada: js-no-existe-99',
      );
      await expect(engine.loadSession('')).rejects.toThrow('Sesión no encontrada');
    });

    it('devuelve el contenido del repositorio sin copiarlo ni alterarlo', async () => {
      const fromEngine = await engine.loadSession('js-functions-return-flow-01');
      const fromRepo = await repo.getSessionById('js-functions-return-flow-01');

      expect(fromEngine).toBe(fromRepo);
      expect(Object.isFrozen(fromEngine)).toBe(true);
    });

    it('no lee el contenido por su cuenta: usa el repositorio que recibe', async () => {
      let llamadas = 0;
      const espia: IContentRepository = {
        getTechnologies: () => Promise.resolve([]),
        getTopicsByTechnology: () => Promise.resolve([]),
        getConceptsByTopic: () => Promise.resolve([]),
        getConceptById: () => Promise.resolve(null),
        getSessionsByConcept: () => Promise.resolve([]),
        getSessionById: (id) => {
          llamadas += 1;
          return repo.getSessionById(id);
        },
      };

      await new ExerciseEngine(espia, new FakeExecutor()).loadSession(
        'js-arrays-map-vs-foreach-01',
      );

      expect(llamadas).toBe(1);
    });
  });

  describe('validateSelection sobre todo el contenido real', () => {
    it('acepta la respuesta correcta de cada paso de selección de las 6 sesiones', async () => {
      let validados = 0;

      for (const id of ALL_SESSIONS) {
        const session = await engine.loadSession(id);
        for (const step of session.steps) {
          if (step.type === 'fix-code') continue;

          const answer: StepAnswer =
            step.type === 'find-error'
              ? { line: step.errorLines![0], errorType: step.errorType! }
              : step.options!.find((o) => o.correct)!.id;

          const result = engine.validateSelection(step, answer);
          expect(result.isCorrect, `${id}/${step.id}`).toBe(true);
          expect(result.explanation).toBe(step.explanation);
          validados += 1;
        }
      }

      expect(validados).toBe(18);
    });

    it('rechaza todas las respuestas incorrectas de cada paso de opción múltiple', async () => {
      let rechazados = 0;

      for (const id of ALL_SESSIONS) {
        const session = await engine.loadSession(id);
        for (const step of session.steps) {
          if (step.type !== 'code-reading' && step.type !== 'predict-output') continue;

          for (const option of step.options!.filter((o) => !o.correct)) {
            expect(engine.validateSelection(step, option.id).isCorrect).toBe(false);
            rechazados += 1;
          }
        }
      }

      expect(rechazados).toBe(36);
    });

    it('delega en la misma regla pura que expone validation.ts', async () => {
      const session = await engine.loadSession('js-arrays-filter-mutation-01');
      const step = session.steps[0];

      expect(engine.validateSelection(step, step.options!.find((o) => o.correct)!.id)).toEqual({
        isCorrect: true,
        explanation: step.explanation,
      });
    });
  });

  describe('T042 · validateFixCode delega la ejecución en el executor', () => {
    it('entrega al executor el código del usuario y los testCases del paso', async () => {
      const step = await fixCodeStepOf('js-arrays-map-vs-foreach-01');
      executor.pasaTodo(step.testCases!);

      await engine.validateFixCode(step, 'function dobles(n) { return n; }');

      expect(executor.llamadas).toHaveLength(1);
      expect(executor.llamadas[0].code).toBe('function dobles(n) { return n; }');
      expect(executor.llamadas[0].testCases).toEqual(step.testCases);
    });

    it('llama al executor una sola vez por validación', async () => {
      const step = await fixCodeStepOf('js-arrays-filter-mutation-01');
      executor.pasaTodo(step.testCases!);

      await engine.validateFixCode(step, 'x');
      expect(executor.llamadas).toHaveLength(1);

      await engine.validateFixCode(step, 'y');
      expect(executor.llamadas).toHaveLength(2);
      expect(executor.llamadas.map((l) => l.code)).toEqual(['x', 'y']);
    });

    it('no ejecuta por su cuenta: sin executor no hay resultado', async () => {
      const step = await fixCodeStepOf('js-arrays-map-vs-foreach-01');
      executor.rechaza('el executor no respondió');

      await expect(engine.validateFixCode(step, 'x')).rejects.toThrow(
        'el executor no respondió',
      );
      expect(executor.llamadas).toHaveLength(1);
    });

    it('no destruye el executor: su ciclo de vida no es del engine', async () => {
      const step = await fixCodeStepOf('js-arrays-map-vs-foreach-01');
      executor.pasaTodo(step.testCases!);

      await engine.validateFixCode(step, 'x');

      expect(executor.destruido).toBe(false);
    });
  });

  describe('T042 · ExecutionResult se traduce a ValidationResult (D016)', () => {
    it('todos los casos pasan → isCorrect true, con la explicación del paso', async () => {
      const step = await fixCodeStepOf('js-arrays-map-vs-foreach-01');
      executor.pasaTodo(step.testCases!);

      const result = await engine.validateFixCode(step, 'función correcta');

      expect(result).toEqual({ isCorrect: true, explanation: step.explanation });
    });

    it('un caso que falla basta para que isCorrect sea false', async () => {
      const step = await fixCodeStepOf('js-arrays-map-vs-foreach-01');
      executor.devuelve([
        { input: [1], expected: [2], actual: [2], pass: true },
        { input: [2], expected: [4], actual: [2], pass: false },
      ]);

      const result = await engine.validateFixCode(step, 'función a medias');

      expect(result.isCorrect).toBe(false);
      expect(result.explanation).toBe(step.explanation);
    });

    it('un error de sintaxis del usuario es respuesta incorrecta, no fallo', async () => {
      const step = await fixCodeStepOf('js-arrays-map-vs-foreach-01');
      executor.devuelve([
        {
          input: [1],
          expected: [2],
          actual: null,
          pass: false,
          error: 'Unexpected token',
        },
      ]);

      const result = await engine.validateFixCode(step, 'function roto( {');

      expect(result.isCorrect).toBe(false);
      expect(result.explanation).toBe(step.explanation);
    });

    it('un error en ejecución tampoco escapa como excepción', async () => {
      const step = await fixCodeStepOf('js-functions-return-flow-01');
      executor.devuelve([
        { input: 1, expected: 2, actual: null, pass: false, error: 'x is not defined' },
      ]);

      await expect(engine.validateFixCode(step, 'x()')).resolves.toMatchObject({
        isCorrect: false,
      });
    });

    it('el resultado no lleva más campos que los de ValidationResult', async () => {
      const step = await fixCodeStepOf('js-arrays-map-vs-foreach-01');
      executor.pasaTodo(step.testCases!);

      const result = await engine.validateFixCode(step, 'x');

      expect(Object.keys(result).sort()).toEqual(['explanation', 'isCorrect']);
    });

    it('funciona con los 6 pasos fix-code del contenido real', async () => {
      for (const id of ALL_SESSIONS) {
        const step = await fixCodeStepOf(id);
        expect(step.testCases!.length, id).toBeGreaterThan(0);

        executor.pasaTodo(step.testCases!);
        const bien = await engine.validateFixCode(step, 'solución');

        executor.devuelve(
          step.testCases!.map((t) => ({
            input: t.input,
            expected: t.expected,
            actual: null,
            pass: false,
          })),
        );
        const mal = await engine.validateFixCode(step, 'roto');

        expect(bien.isCorrect, id).toBe(true);
        expect(mal.isCorrect, id).toBe(false);
        expect(bien.explanation, id).toBe(step.explanation);
      }
    });
  });

  describe('T045 · contrato completo de validateFixCode', () => {
    it('mapea ExecutionResult.pass a isCorrect en ambos sentidos, leyendo `pass` y no `results`', async () => {
      const step = await fixCodeStepOf('js-arrays-map-vs-foreach-01');

      executor.pasaTodo(step.testCases!);
      await expect(engine.validateFixCode(step, 'bien')).resolves.toMatchObject({
        isCorrect: true,
        explanation: step.explanation,
      });

      // Con `pass: false` el veredicto es falso aunque los casos digan otra
      // cosa: el agregado que fija D016 es `pass`, no la lista.
      executor.devuelve([]);
      const vacio: ExecutionResult = { pass: false, results: [] };
      vi.spyOn(executor, 'execute').mockResolvedValueOnce(vacio);
      await expect(engine.validateFixCode(step, 'mal')).resolves.toMatchObject({
        isCorrect: false,
      });
    });

    it('entrega los 3 testCases del paso real y agrega sobre todos', async () => {
      const step = await fixCodeStepOf('js-arrays-map-vs-foreach-01');
      expect(step.testCases).toHaveLength(3);

      // Los tres pasan: correcto.
      executor.devuelve(
        step.testCases!.map((t) => ({
          input: t.input,
          expected: t.expected,
          actual: t.expected,
          pass: true,
        })),
      );
      await expect(engine.validateFixCode(step, 'solución')).resolves.toMatchObject({
        isCorrect: true,
      });

      // El segundo falla y el tercero lanza: ambos viajan como resultado.
      executor.devuelve([
        { input: step.testCases![0].input, expected: step.testCases![0].expected, actual: step.testCases![0].expected, pass: true },
        { input: step.testCases![1].input, expected: step.testCases![1].expected, actual: null, pass: false },
        { input: step.testCases![2].input, expected: step.testCases![2].expected, actual: null, pass: false, error: 'x is not defined' },
      ]);
      await expect(engine.validateFixCode(step, 'a medias')).resolves.toMatchObject({
        isCorrect: false,
      });

      expect(executor.llamadas).toHaveLength(2);
      expect(executor.llamadas[0].testCases).toEqual(step.testCases);
    });
  });

  describe('T042 · los fallos de infraestructura no son respuestas (§27)', () => {
    it.each([
      ['timeout', 'La ejecución superó el límite de 3000 ms'],
      ['caída del worker', 'El worker falló durante la ejecución'],
      ['executor destruido', 'El executor se ha destruido durante la ejecución'],
    ])('propaga el rechazo por %s en vez de convertirlo en incorrecto', async (_n, mensaje) => {
      const step = await fixCodeStepOf('js-arrays-map-vs-foreach-01');
      executor.rechaza(mensaje);

      // §27 los clasifica como recuperables y reintentables, no como una
      // respuesta equivocada del usuario.
      await expect(engine.validateFixCode(step, 'x')).rejects.toThrow(mensaje);
    });

    it('el rechazo llega como Error, no como ValidationResult', async () => {
      const step = await fixCodeStepOf('js-arrays-map-vs-foreach-01');
      executor.rechaza('timeout');

      const capturado = await engine.validateFixCode(step, 'x').catch((e: unknown) => e);

      expect(capturado).toBeInstanceOf(Error);
      expect(capturado).not.toHaveProperty('isCorrect');
    });
  });

  describe('T042 · pasos que validateFixCode no puede validar', () => {
    it.each(['code-reading', 'predict-output', 'find-error'] as const)(
      'lanza con un paso %s',
      async (tipo) => {
        const session = await engine.loadSession('js-arrays-map-vs-foreach-01');
        const step = session.steps.find((s) => s.type === tipo)!;

        await expect(engine.validateFixCode(step, 'x')).rejects.toThrow(
          /solo valida pasos fix-code/,
        );
        expect(executor.llamadas).toHaveLength(0);
      },
    );

    it('lanza si el paso no declara testCases', async () => {
      const base = await fixCodeStepOf('js-arrays-map-vs-foreach-01');

      for (const testCases of [null, []]) {
        const roto: ExerciseStep = { ...base, testCases };

        await expect(engine.validateFixCode(roto, 'x')).rejects.toThrow(
          /no declara testCases/,
        );
      }
      expect(executor.llamadas).toHaveLength(0);
    });
  });

  describe('T042 · no muta nada de lo que recibe', () => {
    it('deja intactos la sesión, el paso y sus testCases', async () => {
      const session = await engine.loadSession('js-arrays-reduce-accumulator-01');
      const step = session.steps.find((s) => s.type === 'fix-code')!;
      const antes = JSON.stringify(session);
      executor.pasaTodo(step.testCases!);

      await engine.validateFixCode(step, 'lo que sea');

      expect(JSON.stringify(session)).toBe(antes);
      expect(executor.llamadas[0].testCases).toEqual(step.testCases);
    });
  });

  describe('T037 · la delegación es exacta, también al fallar', () => {
    it('devuelve lo mismo que la función pura en los 18 pasos validables', async () => {
      let comparados = 0;

      for (const id of ALL_SESSIONS) {
        const session = await engine.loadSession(id);

        for (const step of session.steps) {
          if (step.type === 'fix-code') continue;

          for (const option of step.options!) {
            const answer: StepAnswer =
              step.type === 'find-error'
                ? { line: step.errorLines![0], errorType: option.id }
                : option.id;

            expect(
              engine.validateSelection(step, answer),
              `${id}/${step.id}/${option.id}`,
            ).toEqual(validateSelection(step, answer));
            comparados += 1;
          }
        }
      }

      expect(comparados).toBe(72);
    });

    it('propaga el mismo error que la función pura, no uno propio', async () => {
      const session = await engine.loadSession('js-arrays-filter-mutation-01');
      const findError = session.steps.find((s) => s.type === 'find-error')!;
      const codeReading = session.steps.find((s) => s.type === 'code-reading')!;
      const fixCode = session.steps.find((s) => s.type === 'fix-code')!;

      const casos: [typeof findError, StepAnswer][] = [
        [findError, 'conceptual'],
        [findError, 3],
        [codeReading, { line: 1, errorType: 'x' }],
        [fixCode, 'lo que sea'],
      ];

      for (const [step, answer] of casos) {
        let delEngine = '';
        let deLaFuncion = '';

        try {
          engine.validateSelection(step, answer);
        } catch (e) {
          delEngine = (e as Error).message;
        }
        try {
          validateSelection(step, answer);
        } catch (e) {
          deLaFuncion = (e as Error).message;
        }

        expect(delEngine, `${step.type}`).not.toBe('');
        expect(delEngine).toBe(deLaFuncion);
      }
    });

    it('acepta la respuesta compuesta de find-error a través del engine', async () => {
      const session = await engine.loadSession('js-functions-scope-hoisting-01');
      const step = session.steps.find((s) => s.type === 'find-error')!;

      expect(
        engine.validateSelection(step, {
          line: step.errorLines![0],
          errorType: step.errorType!,
        }).isCorrect,
      ).toBe(true);
      expect(
        engine.validateSelection(step, { line: 99, errorType: step.errorType! }).isCorrect,
      ).toBe(false);
    });
  });

  describe('límites de responsabilidad (D001)', () => {
    it('no valida fix-code: esa ruta ejecuta código y pertenece al Worker', async () => {
      const session = await engine.loadSession('js-functions-return-flow-01');
      const fixCode = session.steps.find((s) => s.type === 'fix-code')!;

      expect(() => engine.validateSelection(fixCode, 'x')).toThrow(/Worker/);
    });

    it('no expone todavía las operaciones de otras tareas', () => {
      const engineAsRecord = engine as unknown as Record<string, unknown>;

      // validateFixCode existe desde T042. calculateScore vive en scoring.ts
      // (T024) y getNextStep todavía no tiene tarea hecha.
      expect(typeof engineAsRecord.validateFixCode).toBe('function');
      expect(typeof engineAsRecord.calculateScore).toBe('undefined');
      expect(typeof engineAsRecord.getNextStep).toBe('undefined');
    });

    it('no altera la sesión al validar sus pasos', async () => {
      const session: ExerciseSession = await engine.loadSession('js-arrays-reduce-accumulator-01');
      const antes = JSON.stringify(session);

      for (const step of session.steps) {
        if (step.type === 'fix-code') continue;
        engine.validateSelection(
          step,
          step.type === 'find-error'
            ? { line: 99, errorType: 'cualquier-cosa' }
            : 'cualquier-cosa',
        );
      }

      expect(JSON.stringify(session)).toBe(antes);
    });
  });
});
