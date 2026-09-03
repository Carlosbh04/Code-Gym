import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import type { ExerciseSession } from '@/types/exercise';
import type { IContentRepository } from '@/types/repository';
import { StaticContentRepository } from './StaticContentRepository';

const ARRAYS_CONCEPT = 'js-array-iteration';
const FUNCTIONS_CONCEPT = 'js-function-basics';
const CLOSURES_CONCEPT = 'js-closure-basics';
const PROMISES_CONCEPT = 'js-promise-flow';

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
        'getConceptsByTopic',
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
      await expect(repo.getConceptsByTopic('x')).resolves.toBeInstanceOf(Array);
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

    it('devuelve una sesión de Closures con sus datos reales', async () => {
      const session = await repo.getSessionById('js-closures-loop-capture-01');

      expect(session?.conceptId).toBe(CLOSURES_CONCEPT);
      expect(session?.difficulty).toBe('beginner');
      expect(session?.steps.map((s) => s.type)).toEqual([
        'code-reading',
        'predict-output',
        'find-error',
        'fix-code',
      ]);
    });

    it('devuelve una sesión de Promises con sus datos reales', async () => {
      const session = await repo.getSessionById('js-promises-await-value-01');

      expect(session?.conceptId).toBe(PROMISES_CONCEPT);
      expect(session?.difficulty).toBe('advanced');
      expect(session?.steps.map((s) => s.type)).toEqual([
        'code-reading', 'predict-output', 'find-error', 'fix-code',
      ]);
    });

    it('devuelve null cuando el id no existe', async () => {
      await expect(repo.getSessionById('js-arrays-no-existe-99')).resolves.toBeNull();
    });

    it('devuelve null con un id vacío', async () => {
      await expect(repo.getSessionById('')).resolves.toBeNull();
    });
  });

  describe('consulta por concepto sobre el contenido real', () => {
    it('no conserva un camino loadAll para resolver sesiones por concepto', () => {
      const source = readFileSync(
        'src/lib/repositories/StaticContentRepository.ts',
        'utf8',
      );

      expect(source).not.toContain('loadAll');
      expect(source).toContain('path.startsWith(topicDirectory)');
    });

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

    it('devuelve las 3 sesiones de Closures', async () => {
      const sessions = await repo.getSessionsByConcept(CLOSURES_CONCEPT);

      expect(sessions).toHaveLength(3);
      expect(sessions.map((s) => s.difficulty).sort()).toEqual([
        'advanced',
        'beginner',
        'intermediate',
      ]);
      expect(sessions.every((s) => s.conceptId === CLOSURES_CONCEPT)).toBe(true);
    });

    it('devuelve las 3 sesiones de Promises', async () => {
      const sessions = await repo.getSessionsByConcept(PROMISES_CONCEPT);

      expect(sessions.map((s) => s.id).sort()).toEqual([
        'js-promises-await-value-01', 'js-promises-chain-transform-01',
        'js-promises-error-recovery-01',
      ]);
      expect(sessions.every((session) => session.conceptId === PROMISES_CONCEPT)).toBe(true);
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

    it('solo devuelve loaders del topic físico que contiene el concepto', async () => {
      const arrays = await repo.getSessionsByConcept(ARRAYS_CONCEPT);

      expect(arrays).toHaveLength(3);
      expect(arrays.every((session) => session.id.startsWith('js-arrays-'))).toBe(true);
      expect(arrays.some((session) => session.id.startsWith('js-functions-'))).toBe(false);
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

  describe('indices de contenido (T021)', () => {
    it('devuelve los conceptos del topic en su orden canónico sin cargar sesiones', async () => {
      const source = readFileSync(
        'src/lib/repositories/StaticContentRepository.ts',
        'utf8',
      );
      const topicQuerySource = source.slice(
        source.indexOf('private async loadConceptsByTopic'),
        source.indexOf('private async findConceptPath'),
      );
      const concepts = await repo.getConceptsByTopic('js-arrays');

      expect(concepts.map((concept) => concept.id)).toEqual([ARRAYS_CONCEPT]);
      expect(concepts[0]?.contentMarkdown).toContain('forEach');
      expect(topicQuerySource).not.toContain('sessionLoaders');
      expect(topicQuerySource).not.toContain('loadSession(');
    });

    it('devuelve una colección vacía para un topic sin conceptos', async () => {
      await expect(repo.getConceptsByTopic('js-no-existe')).resolves.toEqual([]);
    });

    it('reutiliza los conceptos compuestos y devuelve arrays propiedad del llamante', async () => {
      const first = await repo.getConceptsByTopic('js-arrays');
      const second = await repo.getConceptsByTopic('js-arrays');

      expect(first).not.toBe(second);
      expect(first[0]).toBe(second[0]);
      first.reverse();
      expect((await repo.getConceptsByTopic('js-arrays')).map((concept) => concept.id)).toEqual([
        ARRAYS_CONCEPT,
      ]);
    });

    it('carga las tecnologias declaradas en technologies.json', async () => {
      const technologies = await repo.getTechnologies();

      expect(technologies).toHaveLength(1);
      expect(technologies[0]).toEqual({
        id: 'javascript',
        name: 'JavaScript',
        icon: 'js',
        description: expect.any(String),
      });
    });

    it('devuelve los topics de JavaScript', async () => {
      const topics = await repo.getTopicsByTechnology('javascript');

      expect(topics.map((t) => t.id)).toEqual(['js-arrays', 'js-functions', 'js-closures', 'js-promises']);
      expect(topics.every((t) => t.technologyId === 'javascript')).toBe(true);
      expect(topics.every((t) => t.name.length > 0 && t.description.length > 0)).toBe(true);
    });

    it('devuelve vacio para una tecnologia no declarada', async () => {
      await expect(repo.getTopicsByTechnology('rust')).resolves.toEqual([]);
    });

    it('no expone los topics todavia no implementados', async () => {
      const topics = await repo.getTopicsByTechnology('javascript');
      const ids = topics.map((t) => t.id);

      for (const pendiente of ['js-objects', 'js-es6-plus', 'js-errors']) {
        expect(ids).not.toContain(pendiente);
      }
    });

    it('resuelve el concepto de Arrays con su prosa', async () => {
      const concept = await repo.getConceptById('js-array-iteration');

      expect(concept).not.toBeNull();
      expect(concept?.topicId).toBe('js-arrays');
      expect(concept?.technologyId).toBe('javascript');
      expect(concept?.name.length).toBeGreaterThan(0);
      expect(concept?.contentMarkdown).toContain('forEach');
    });

    it('resuelve el concepto de Functions con su prosa', async () => {
      const concept = await repo.getConceptById('js-function-basics');

      expect(concept?.topicId).toBe('js-functions');
      expect(concept?.contentMarkdown).toContain('hoisting');
    });

    it('resuelve el concepto de Closures con su prosa', async () => {
      const concept = await repo.getConceptById('js-closure-basics');

      expect(concept?.topicId).toBe('js-closures');
      expect(concept?.contentMarkdown).toContain('closure');
    });

    it('resuelve el concepto de Promises con su prosa', async () => {
      const concept = await repo.getConceptById(PROMISES_CONCEPT);

      expect(concept?.topicId).toBe('js-promises');
      expect(concept?.contentMarkdown).toContain('Promise');
    });

    it('devuelve null para un concepto inexistente', async () => {
      await expect(repo.getConceptById('js-no-existe')).resolves.toBeNull();
    });

    it('congela y no duplica los datos de los indices', async () => {
      const first = await repo.getConceptById('js-array-iteration');
      const second = await repo.getConceptById('js-array-iteration');

      expect(first).toBe(second);
      expect(Object.isFrozen(first)).toBe(true);
      expect(Object.isFrozen(await repo.getTechnologies())).toBe(true);
    });

    it('el grafo technology -> topic -> concept -> session es coherente', async () => {
      const technologies = await repo.getTechnologies();
      const topicIds = new Set<string>();

      for (const technology of technologies) {
        const topics = await repo.getTopicsByTechnology(technology.id);
        for (const topic of topics) {
          expect(topic.technologyId).toBe(technology.id);
          topicIds.add(topic.id);
        }
      }

      for (const conceptId of ['js-array-iteration', 'js-function-basics', 'js-closure-basics', PROMISES_CONCEPT]) {
        const concept = await repo.getConceptById(conceptId);
        expect(concept).not.toBeNull();
        expect(topicIds).toContain(concept?.topicId);
        expect(technologies.map((t) => t.id)).toContain(concept?.technologyId);

        const sessions = await repo.getSessionsByConcept(conceptId);
        expect(sessions.length).toBeGreaterThan(0);
        for (const session of sessions) {
          expect(session.conceptId).toBe(conceptId);
          expect(session.technologyId).toBe(concept?.technologyId);
        }
      }
    });
  });

  describe('integridad del contenido servido', () => {
    it('las 12 sesiones del repositorio son las de T017, T018, T063 y T064', async () => {
      const all = [
        ...(await repo.getSessionsByConcept(ARRAYS_CONCEPT)),
        ...(await repo.getSessionsByConcept(FUNCTIONS_CONCEPT)),
        ...(await repo.getSessionsByConcept(CLOSURES_CONCEPT)),
        ...(await repo.getSessionsByConcept(PROMISES_CONCEPT)),
      ];

      expect(all).toHaveLength(12);
      expect(new Set(all.map((s) => s.id)).size).toBe(12);
      expect(all.every((s) => s.status === 'published')).toBe(true);
      expect(all.every((s) => s.steps.length === 4)).toBe(true);
      expect(all.every((s) => s.steps.every((st, i) => st.stepOrder === i + 1))).toBe(true);
    });
  });

  describe('carga perezosa y reutilizacion entre instancias (T022)', () => {
    it('no precarga nada: toda lectura se resuelve de forma asincrona', () => {
      const fresh = new StaticContentRepository();

      expect(fresh.getTechnologies()).toBeInstanceOf(Promise);
      expect(fresh.getSessionsByConcept(ARRAYS_CONCEPT)).toBeInstanceOf(Promise);
      expect(fresh.getSessionById('js-arrays-map-vs-foreach-01')).toBeInstanceOf(Promise);
    });

    it('dos instancias distintas comparten el contenido ya cargado', async () => {
      const a = await new StaticContentRepository().getSessionById('js-arrays-map-vs-foreach-01');
      const b = await new StaticContentRepository().getSessionById('js-arrays-map-vs-foreach-01');

      expect(a).toBe(b);
    });

    it('dos instancias distintas comparten el concepto ya compuesto', async () => {
      const a = await new StaticContentRepository().getConceptById(ARRAYS_CONCEPT);
      const b = await new StaticContentRepository().getConceptById(ARRAYS_CONCEPT);

      expect(a).toBe(b);
    });

    it('las lecturas concurrentes devuelven el mismo contenido sin duplicarlo', async () => {
      const [first, second] = await Promise.all([
        repo.getSessionsByConcept(ARRAYS_CONCEPT),
        repo.getSessionsByConcept(ARRAYS_CONCEPT),
      ]);

      expect(first).not.toBe(second);
      expect(first).toHaveLength(3);
      first.forEach((session, i) => expect(session).toBe(second[i]));
    });
  });

  describe('propiedad del resultado (T022)', () => {
    it('el array de una consulta pertenece al llamante y puede ordenarse', async () => {
      const sessions = await repo.getSessionsByConcept(ARRAYS_CONCEPT);
      const original = sessions.map((s) => s.id);

      sessions.reverse();
      const again = await repo.getSessionsByConcept(ARRAYS_CONCEPT);

      expect(again.map((s) => s.id)).toEqual(original);
    });

    it('los arrays de los indices son datos compartidos y estan congelados', async () => {
      const technologies = await repo.getTechnologies();
      const topics = await repo.getTopicsByTechnology('javascript');

      expect(Object.isFrozen(technologies)).toBe(true);
      expect(Object.isFrozen(topics)).toBe(true);
      expect(Object.isFrozen(topics[0])).toBe(true);
      expect(() => topics.push(topics[0])).toThrow(TypeError);
    });

    it('congela las estructuras anidadas mas profundas de una sesion', async () => {
      const session = (await repo.getSessionById(
        'js-arrays-map-vs-foreach-01',
      )) as ExerciseSession;
      const fixStep = session.steps.find((s) => s.type === 'fix-code');

      expect(Object.isFrozen(fixStep?.testCases)).toBe(true);
      expect(Object.isFrozen(fixStep?.testCases?.[0])).toBe(true);
      expect(() => {
        (fixStep?.testCases?.[0] as { call: string }).call = 'roto';
      }).toThrow(TypeError);
    });

    it('un updatedAt nulo no rompe la congelacion', async () => {
      const session = await repo.getSessionById('js-functions-return-flow-01');

      expect(session?.updatedAt).toBeNull();
      expect(Object.isFrozen(session)).toBe(true);
    });
  });

  describe('identificadores no validos (T022)', () => {
    it('los identificadores distinguen mayusculas', async () => {
      await expect(repo.getSessionById('JS-ARRAYS-MAP-VS-FOREACH-01')).resolves.toBeNull();
      await expect(repo.getConceptById('JS-ARRAY-ITERATION')).resolves.toBeNull();
    });

    it('no confunde un id que es prefijo de otro real', async () => {
      await expect(repo.getSessionById('js-arrays-map-vs-foreach')).resolves.toBeNull();
      await expect(repo.getSessionsByConcept('js-array')).resolves.toEqual([]);
    });

    it('ignora los espacios significativos', async () => {
      await expect(repo.getSessionById(' js-arrays-map-vs-foreach-01 ')).resolves.toBeNull();
    });

    it('no resuelve claves del prototipo ni rutas relativas', async () => {
      await expect(repo.getTopicsByTechnology('__proto__')).resolves.toEqual([]);
      await expect(repo.getTopicsByTechnology('constructor')).resolves.toEqual([]);
      await expect(repo.getTopicsByTechnology('../..')).resolves.toEqual([]);
      await expect(repo.getTopicsByTechnology('')).resolves.toEqual([]);
    });
  });

  describe('integridad referencial completa desde las sesiones (T022)', () => {
    const SESSION_IDS = [
      'js-arrays-filter-mutation-01',
      'js-arrays-map-vs-foreach-01',
      'js-arrays-reduce-accumulator-01',
      'js-functions-default-parameters-01',
      'js-functions-return-flow-01',
      'js-functions-scope-hoisting-01',
      'js-closures-loop-capture-01',
      'js-closures-shared-state-01',
      'js-closures-live-binding-01',
      'js-promises-chain-transform-01',
      'js-promises-error-recovery-01',
      'js-promises-await-value-01',
    ];

    it('cada sesion resuelve su concepto, su topic y su tecnologia', async () => {
      const technologyIds = (await repo.getTechnologies()).map((t) => t.id);

      for (const sessionId of SESSION_IDS) {
        const session = await repo.getSessionById(sessionId);
        expect(session, sessionId).not.toBeNull();
        expect(technologyIds).toContain(session?.technologyId);

        const concept = await repo.getConceptById(session!.conceptId);
        expect(concept, session!.conceptId).not.toBeNull();
        expect(concept?.technologyId).toBe(session?.technologyId);
        expect(concept?.contentMarkdown.length).toBeGreaterThan(0);

        const topics = await repo.getTopicsByTechnology(session!.technologyId);
        expect(topics.map((t) => t.id)).toContain(concept?.topicId);
      }
    });

    it('la sesion recuperada por id es la misma que devuelve la consulta por concepto', async () => {
      const sessions = await repo.getSessionsByConcept(FUNCTIONS_CONCEPT);

      for (const session of sessions) {
        expect(await repo.getSessionById(session.id)).toBe(session);
      }
    });
  });
});
