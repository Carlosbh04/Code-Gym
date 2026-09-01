import { beforeEach, describe, expect, it } from 'vitest';
import type { ExerciseSession } from '@/types/exercise';
import type { IContentRepository } from '@/types/repository';
import { StaticContentRepository } from './StaticContentRepository';

const ARRAYS_CONCEPT = 'js-array-iteration';
const FUNCTIONS_CONCEPT = 'js-function-basics';

describe('StaticContentRepository (T019)', () => {
  let repo: IContentRepository;

  beforeEach(() => {
    repo = new StaticContentRepository();
  });

  describe('contrato', () => {
    it('se instancia y cumple IContentRepository', () => {
      expect(repo).toBeInstanceOf(StaticContentRepository);
      for (const method of [
        'getTechnologies',
        'getTopicsByTechnology',
        'getConceptById',
        'getSessionsByConcept',
        'getSessionById',
      ] as const) {
        expect(typeof repo[method]).toBe('function');
      }
    });

    it('todas las operaciones devuelven promesas', async () => {
      await expect(repo.getTechnologies()).resolves.toBeInstanceOf(Array);
      await expect(repo.getTopicsByTechnology('javascript')).resolves.toBeInstanceOf(Array);
      await expect(repo.getConceptById('x')).resolves.toBeNull();
      await expect(repo.getSessionsByConcept('x')).resolves.toBeInstanceOf(Array);
      await expect(repo.getSessionById('x')).resolves.toBeNull();
    });
  });

  describe('búsqueda por id sobre el contenido real', () => {
    it('devuelve una sesión de Arrays con sus datos reales', async () => {
      const session = await repo.getSessionById('js-arrays-map-vs-foreach-01');

      expect(session).not.toBeNull();
      expect(session?.conceptId).toBe(ARRAYS_CONCEPT);
      expect(session?.technologyId).toBe('javascript');
      expect(session?.difficulty).toBe('beginner');
      expect(session?.steps).toHaveLength(4);
      expect(session?.steps.map((s) => s.type)).toEqual([
        'code-reading',
        'predict-output',
        'find-error',
        'fix-code',
      ]);
    });

    it('devuelve una sesión de Functions con sus datos reales', async () => {
      const session = await repo.getSessionById('js-functions-return-flow-01');

      expect(session?.conceptId).toBe(FUNCTIONS_CONCEPT);
      expect(session?.difficulty).toBe('advanced');
      expect(session?.steps.at(-1)?.testCases).not.toBeNull();
    });

    it('devuelve null cuando el id no existe', async () => {
      await expect(repo.getSessionById('js-arrays-no-existe-99')).resolves.toBeNull();
    });

    it('devuelve null con un id vacío', async () => {
      await expect(repo.getSessionById('')).resolves.toBeNull();
    });
  });

  describe('consulta por concepto sobre el contenido real', () => {
    it('devuelve las 3 sesiones de Arrays', async () => {
      const sessions = await repo.getSessionsByConcept(ARRAYS_CONCEPT);

      expect(sessions).toHaveLength(3);
      expect(sessions.map((s) => s.id).sort()).toEqual([
        'js-arrays-filter-mutation-01',
        'js-arrays-map-vs-foreach-01',
        'js-arrays-reduce-accumulator-01',
      ]);
      expect(sessions.every((s) => s.conceptId === ARRAYS_CONCEPT)).toBe(true);
    });

    it('devuelve las 3 sesiones de Functions', async () => {
      const sessions = await repo.getSessionsByConcept(FUNCTIONS_CONCEPT);

      expect(sessions).toHaveLength(3);
      expect(sessions.map((s) => s.difficulty).sort()).toEqual([
        'advanced',
        'beginner',
        'intermediate',
      ]);
    });

    it('no mezcla sesiones entre conceptos', async () => {
      const arrays = await repo.getSessionsByConcept(ARRAYS_CONCEPT);
      const functions = await repo.getSessionsByConcept(FUNCTIONS_CONCEPT);
      const shared = arrays.filter((a) => functions.some((f) => f.id === a.id));

      expect(shared).toEqual([]);
    });

    it('devuelve una lista vacía para un concepto inexistente', async () => {
      await expect(repo.getSessionsByConcept('js-no-existe')).resolves.toEqual([]);
    });

    it('mantiene un orden estable entre llamadas', async () => {
      const first = await repo.getSessionsByConcept(ARRAYS_CONCEPT);
      const second = await repo.getSessionsByConcept(ARRAYS_CONCEPT);

      expect(first.map((s) => s.id)).toEqual(second.map((s) => s.id));
    });
  });

  describe('inmutabilidad y no duplicación', () => {
    it('congela en profundidad el contenido devuelto', async () => {
      const session = (await repo.getSessionById(
        'js-arrays-filter-mutation-01',
      )) as ExerciseSession;

      expect(Object.isFrozen(session)).toBe(true);
      expect(Object.isFrozen(session.steps)).toBe(true);
      expect(Object.isFrozen(session.steps[0])).toBe(true);
      expect(Object.isFrozen(session.steps[0].options)).toBe(true);
      expect(Object.isFrozen(session.steps[0].hints)).toBe(true);
    });

    it('rechaza una mutación del contenido devuelto', async () => {
      const session = (await repo.getSessionById(
        'js-arrays-filter-mutation-01',
      )) as ExerciseSession;

      expect(() => {
        (session as { title: string }).title = 'modificado';
      }).toThrow(TypeError);
      expect(() => {
        session.steps.push(session.steps[0]);
      }).toThrow(TypeError);
    });

    it('un intento de mutación no contamina llamadas posteriores', async () => {
      const first = await repo.getSessionById('js-arrays-reduce-accumulator-01');
      const original = first?.title;
      try {
        (first as { title: string }).title = 'roto';
      } catch {
        // esperado: el contenido está congelado
      }
      const second = await new StaticContentRepository().getSessionById(
        'js-arrays-reduce-accumulator-01',
      );

      expect(second?.title).toBe(original);
    });

    it('no duplica los datos: dos lecturas comparten la misma referencia', async () => {
      const first = await repo.getSessionById('js-functions-scope-hoisting-01');
      const second = await repo.getSessionById('js-functions-scope-hoisting-01');

      expect(first).toBe(second);
    });
  });

  describe('operaciones cuya fuente de datos llega en T021', () => {
    it('getTechnologies devuelve vacío mientras no exista technologies.json', async () => {
      await expect(repo.getTechnologies()).resolves.toEqual([]);
    });

    it('getTopicsByTechnology devuelve vacío mientras no exista el índice de topics', async () => {
      await expect(repo.getTopicsByTechnology('javascript')).resolves.toEqual([]);
    });

    it('getConceptById devuelve null mientras no existan los metadatos del concepto', async () => {
      await expect(repo.getConceptById(ARRAYS_CONCEPT)).resolves.toBeNull();
    });
  });

  describe('integridad del contenido servido', () => {
    it('las 6 sesiones del repositorio son las de T017 y T018', async () => {
      const all = [
        ...(await repo.getSessionsByConcept(ARRAYS_CONCEPT)),
        ...(await repo.getSessionsByConcept(FUNCTIONS_CONCEPT)),
      ];

      expect(all).toHaveLength(6);
      expect(new Set(all.map((s) => s.id)).size).toBe(6);
      expect(all.every((s) => s.status === 'published')).toBe(true);
      expect(all.every((s) => s.steps.length === 4)).toBe(true);
      expect(all.every((s) => s.steps.every((st, i) => st.stepOrder === i + 1))).toBe(true);
    });
  });
});
