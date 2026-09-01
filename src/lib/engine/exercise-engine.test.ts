import { beforeEach, describe, expect, it } from 'vitest';
import { StaticContentRepository } from '@/lib/repositories/StaticContentRepository';
import type { ExerciseSession, StepAnswer } from '@/types/exercise';
import type { IContentRepository } from '@/types/repository';
import { ExerciseEngine } from './exercise-engine';

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

  beforeEach(() => {
    repo = new StaticContentRepository();
    engine = new ExerciseEngine(repo);
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
        getConceptById: () => Promise.resolve(null),
        getSessionsByConcept: () => Promise.resolve([]),
        getSessionById: (id) => {
          llamadas += 1;
          return repo.getSessionById(id);
        },
      };

      await new ExerciseEngine(espia).loadSession('js-arrays-map-vs-foreach-01');

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

  describe('límites de responsabilidad (D001)', () => {
    it('no valida fix-code: esa ruta ejecuta código y pertenece al Worker', async () => {
      const session = await engine.loadSession('js-functions-return-flow-01');
      const fixCode = session.steps.find((s) => s.type === 'fix-code')!;

      expect(() => engine.validateSelection(fixCode, 'x')).toThrow(/Worker/);
    });

    it('no expone todavía las operaciones de otras tareas', () => {
      const engineAsRecord = engine as unknown as Record<string, unknown>;

      expect(typeof engineAsRecord.validateFixCode).toBe('undefined');
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
