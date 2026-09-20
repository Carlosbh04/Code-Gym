import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import type { ExerciseSession } from '@/types/exercise';
import type { IContentRepository } from '@/types/repository';
import { StaticContentRepository } from './StaticContentRepository';

const ARRAYS_CONCEPT = 'js-array-iteration';
const FUNCTIONS_CONCEPT = 'js-function-basics';
const CLOSURES_CONCEPT = 'js-closure-basics';
const PROMISES_CONCEPT = 'js-promise-flow';
const OBJECTS_CONCEPT = 'js-object-references';
const ES6_PLUS_CONCEPT = 'js-es6-modern-syntax';
const ERRORS_CONCEPT = 'js-error-handling';

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
      expect(session?.difficulty).toBe('intermediate');
      expect(session?.steps.at(-1)?.requirements.length).toBeGreaterThan(0);
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

    it('devuelve una sesión de Objects con sus datos reales', async () => {
      const session = await repo.getSessionById('js-objects-shared-reference-01');

      expect(session?.conceptId).toBe(OBJECTS_CONCEPT);
      expect(session?.difficulty).toBe('intermediate');
      expect(session?.steps.map((s) => s.type)).toEqual([
        'code-reading', 'predict-output', 'find-error', 'fix-code',
      ]);
    });

    it('devuelve una sesión de ES6+ con sus datos reales', async () => {
      const session = await repo.getSessionById('js-es6-nullish-defaults-01');

      expect(session?.conceptId).toBe(ES6_PLUS_CONCEPT);
      expect(session?.difficulty).toBe('advanced');
      expect(session?.steps.map((s) => s.type)).toEqual([
        'code-reading', 'predict-output', 'find-error', 'fix-code',
      ]);
    });

    it('devuelve una sesión de Errors con sus datos reales', async () => {
      const session = await repo.getSessionById('js-errors-finally-cleanup-01');
      expect(session?.conceptId).toBe(ERRORS_CONCEPT);
      expect(session?.difficulty).toBe('advanced');
      expect(session?.steps).toHaveLength(4);
    });

    it('devuelve una sesión de selección para cada tecnología sin fingir ejecución', async () => {
      const samples = [
        'html-document-basics-01', 'css-cascade-specificity-01', 'react-components-basics-01',
        'node-modules-imports-01', 'sql-select-columns-01',
      ];

      for (const sessionId of samples) {
        const session = await repo.getSessionById(sessionId);
        expect(session, sessionId).not.toBeNull();
        expect(session?.steps.length).toBeGreaterThan(0);
        expect(session?.steps.every((step) => step.type === 'code-reading')).toBe(true);
        expect(session?.steps.every((step) => step.requirements.length === 0)).toBe(true);
      }
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

    it('devuelve las 18 sesiones de Arrays', async () => {
      const sessions = await repo.getSessionsByConcept(ARRAYS_CONCEPT);

      expect(sessions).toHaveLength(18);
      expect(sessions.map((s) => s.id).sort()).toEqual([
        'js-arrays-coding-transform-01',
        'js-arrays-deepening-callback-effects-01',
        'js-arrays-deepening-chaining-01',
        'js-arrays-deepening-checkpoint-01',
        'js-arrays-deepening-mutation-01',
        'js-arrays-deepening-quiz-01',
        'js-arrays-deepening-references-01',
        'js-arrays-filter-mutation-01',
        'js-arrays-iteration-checkpoint-01',
        'js-arrays-iteration-quiz-01',
        'js-arrays-map-vs-foreach-01',
        'js-arrays-mastery-checkpoint-01',
        'js-arrays-mastery-frequency-01',
        'js-arrays-mastery-grouping-01',
        'js-arrays-mastery-integrated-01',
        'js-arrays-mastery-object-accumulator-01',
        'js-arrays-mastery-quiz-01',
        'js-arrays-reduce-accumulator-01',
]);
      expect(sessions.every((s) => s.conceptId === ARRAYS_CONCEPT)).toBe(true);
    });

    it(
      'devuelve las 15 sesiones staged de Functions',
      async () => {
        const sessions =
          await repo.getSessionsByConcept(
            FUNCTIONS_CONCEPT,
          );

        expect(
          sessions,
        ).toHaveLength(
          15,
        );

        expect(
          sessions.every(
            session =>
              session.requiredForProgression
              === true,
          ),
        ).toBe(
          true,
        );

        const signature =
          sessions
            .map(
              session =>
                [
                  session.levelId,
                  session.kind,
                  session.id,
                ].join(':'),
            )
            .sort();

        expect(
          signature,
        ).toEqual(
          [
            'deepening:checkpoint:js-functions-deepening-checkpoint-01',
            'deepening:practice:js-functions-deepening-callbacks-01',
            'deepening:practice:js-functions-return-flow-01',
            'deepening:practice:js-functions-scope-hoisting-01',
            'deepening:quiz:js-functions-deepening-quiz-01',
            'foundation:checkpoint:js-functions-foundation-checkpoint-01',
            'foundation:practice:js-functions-coding-format-name-01',
            'foundation:practice:js-functions-default-parameters-01',
            'foundation:practice:js-functions-foundation-reference-execution-01',
            'foundation:quiz:js-functions-foundation-quiz-01',
            'mastery:checkpoint:js-functions-mastery-checkpoint-01',
            'mastery:practice:js-functions-mastery-consistent-return-01',
            'mastery:practice:js-functions-mastery-contracts-01',
            'mastery:practice:js-functions-mastery-pipeline-effects-01',
            'mastery:quiz:js-functions-mastery-quiz-01',
          ].sort(),
        );

        expect(
          sessions
            .filter(
              session =>
                session.kind === 'quiz',
            )
            .every(
              session =>
                session.passingPercentage
                === 100,
            ),
        ).toBe(
          true,
        );

        expect(
          sessions
            .filter(
              session =>
                session.kind !== 'quiz',
            )
            .every(
              session =>
                session.passingPercentage
                === null,
            ),
        ).toBe(
          true,
        );

        expect(
          sessions
            .map(
              session =>
                session.difficulty,
            )
            .sort(),
        ).toEqual(
          [
            'advanced',
            'advanced',
            'advanced',
            'advanced',
            'advanced',
            'beginner',
            'beginner',
            'beginner',
            'beginner',
            'beginner',
            'intermediate',
            'intermediate',
            'intermediate',
            'intermediate',
            'intermediate',
          ].sort(),
        );
      },
    );

    it('devuelve las 16 sesiones de Closures', async () => {
      const sessions = await repo.getSessionsByConcept(CLOSURES_CONCEPT);

      expect(sessions).toHaveLength(16);
      expect(sessions.map((s) => s.difficulty).sort()).toEqual([
        'advanced',
        'advanced',
        'advanced',
        'advanced',
        'advanced',
        'advanced',
        'beginner',
        'beginner',
        'beginner',
        'intermediate',
        'intermediate',
        'intermediate',
        'intermediate',
        'intermediate',
        'intermediate',
        'intermediate',
      ]);
      expect(sessions.every((s) => s.conceptId === CLOSURES_CONCEPT)).toBe(true);
    });

    it('devuelve las 6 sesiones de Promises', async () => {
      const sessions = await repo.getSessionsByConcept(PROMISES_CONCEPT);

      expect(sessions.map((s) => s.id).sort()).toEqual([
        'js-promises-await-value-01',
        'js-promises-chain-transform-01',
        'js-promises-coding-fetch-label-01',
        'js-promises-error-recovery-01',
        'js-promises-foundation-checkpoint-01',
        'js-promises-foundation-quiz-01',
      ]);
      expect(sessions.every((session) => session.conceptId === PROMISES_CONCEPT)).toBe(true);
    });

    it('devuelve las 16 sesiones de Objects', async () => {
      const sessions = await repo.getSessionsByConcept(OBJECTS_CONCEPT);

      expect(sessions).toHaveLength(16);
      expect(sessions.map((session) => session.id).sort()).toEqual([
          'js-objects-coding-pick-01',
          'js-objects-deepening-checkpoint-01',
          'js-objects-deepening-entry-transform-01',
          'js-objects-deepening-merge-precedence-01',
          'js-objects-deepening-nested-copy-01',
          'js-objects-deepening-quiz-01',
          'js-objects-dynamic-properties-01',
          'js-objects-foundation-checkpoint-01',
          'js-objects-foundation-quiz-01',
          'js-objects-mastery-aliasing-01',
          'js-objects-mastery-checkpoint-01',
          'js-objects-mastery-nested-config-01',
          'js-objects-mastery-normalize-01',
          'js-objects-mastery-quiz-01',
          'js-objects-object-entries-01',
          'js-objects-shared-reference-01',
        ]);
      expect(sessions.every((session) => session.conceptId === OBJECTS_CONCEPT)).toBe(true);
    });

    it('devuelve las 6 sesiones de ES6+', async () => {
      const sessions = await repo.getSessionsByConcept(ES6_PLUS_CONCEPT);

      expect(sessions.map((session) => session.id).sort()).toEqual([
        'js-es6-coding-unique-tags-01',
        'js-es6-destructuring-shapes-01',
        'js-es6-foundation-checkpoint-01',
        'js-es6-foundation-quiz-01',
        'js-es6-nullish-defaults-01',
        'js-es6-rest-arguments-01',
      ]);
      expect(sessions.every((session) => session.conceptId === ES6_PLUS_CONCEPT)).toBe(true);
    });

    it('devuelve las 6 sesiones de Errors', async () => {
      const sessions = await repo.getSessionsByConcept(ERRORS_CONCEPT);
      expect(sessions.map((session) => session.id).sort()).toEqual([
        'js-errors-catch-context-01',
        'js-errors-coding-parse-number-01',
        'js-errors-finally-cleanup-01',
        'js-errors-foundation-checkpoint-01',
        'js-errors-foundation-quiz-01',
        'js-errors-throw-validation-01',
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

    it('solo devuelve loaders del topic físico que contiene el concepto', async () => {
      const arrays = await repo.getSessionsByConcept(ARRAYS_CONCEPT);

      expect(arrays).toHaveLength(18);
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
      expect(Object.isFrozen(session.steps[0].requirements)).toBe(true);
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

      expect(technologies.map((technology) => technology.id)).toEqual([
        'javascript', 'html', 'css', 'react', 'nodejs', 'sql',
      ]);
      expect(technologies.every((technology) => technology.name.length > 0)).toBe(true);
      expect(technologies.every((technology) => technology.description.length > 0)).toBe(true);
    });

    it('devuelve los topics de JavaScript', async () => {
      const topics = await repo.getTopicsByTechnology('javascript');

      expect(topics.map((t) => t.id)).toEqual([
        'js-fundamentals',
        'js-arrays',
        'js-functions',
        'js-closures',
        'js-promises',
        'js-objects',
        'js-es6-plus',
        'js-errors',
      ]);
      expect(topics.every((t) => t.technologyId === 'javascript')).toBe(true);
      expect(topics.every((t) => t.name.length > 0 && t.description.length > 0)).toBe(true);
    });

    it('resuelve topics de cada tecnología ampliada sin cargar sesiones ajenas', async () => {
      const samples = [
        ['html', 'html-document'], ['css', 'css-cascade'], ['react', 'react-components'],
        ['nodejs', 'node-modules'], ['sql', 'sql-select'],
      ] as const;

      for (const [technologyId, firstTopicId] of samples) {
        const topics = await repo.getTopicsByTechnology(technologyId);
        expect(topics.length, technologyId).toBeGreaterThanOrEqual(5);
        expect(topics[0]?.id, technologyId).toBe(firstTopicId);
      }
    });

    it('devuelve vacio para una tecnologia no declarada', async () => {
      await expect(repo.getTopicsByTechnology('rust')).resolves.toEqual([]);
    });

    it('no expone los topics todavia no implementados', async () => {
      const topics = await repo.getTopicsByTechnology('javascript');
      const ids = topics.map((t) => t.id);

      for (const pendiente of []) {
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
      expect(concept?.content?.sections.length).toBeGreaterThanOrEqual(4);
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

    it('resuelve el concepto de Objects con su prosa', async () => {
      const concept = await repo.getConceptById(OBJECTS_CONCEPT);

      expect(concept?.topicId).toBe('js-objects');
      expect(concept?.contentMarkdown).toContain('referencia');
    });

    it('resuelve el concepto de ES6+ con su prosa', async () => {
      const concept = await repo.getConceptById(ES6_PLUS_CONCEPT);

      expect(concept?.topicId).toBe('js-es6-plus');
      expect(concept?.contentMarkdown).toContain('destructuring');
    });

    it('resuelve el concepto de Errors con su prosa', async () => {
      const concept = await repo.getConceptById(ERRORS_CONCEPT);
      expect(concept?.topicId).toBe('js-errors');
      expect(concept?.contentMarkdown).toContain('throw');
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

      for (const conceptId of [
        'js-array-iteration',
        'js-function-basics',
        'js-closure-basics',
        PROMISES_CONCEPT,
        OBJECTS_CONCEPT,
        ES6_PLUS_CONCEPT,
        ERRORS_CONCEPT,
      ]) {
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
    it('las 83 sesiones de JavaScript conservan su contrato', async () => {
      const all = [
        ...(await repo.getSessionsByConcept(ARRAYS_CONCEPT)),
        ...(await repo.getSessionsByConcept(FUNCTIONS_CONCEPT)),
        ...(await repo.getSessionsByConcept(CLOSURES_CONCEPT)),
        ...(await repo.getSessionsByConcept(PROMISES_CONCEPT)),
        ...(await repo.getSessionsByConcept(OBJECTS_CONCEPT)),
        ...(await repo.getSessionsByConcept(ES6_PLUS_CONCEPT)),
        ...(await repo.getSessionsByConcept(ERRORS_CONCEPT)),
      ];

      expect(all).toHaveLength(83);
      expect(new Set(all.map((s) => s.id)).size).toBe(83);
      expect(all.every((s) => s.status === 'published')).toBe(true);
      expect(all.every((s) => s.steps.length >= 1)).toBe(true);
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
      expect(first).toHaveLength(18);
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

    it('congela las estructuras públicas y no incluye datos privados', async () => {
      const session = (await repo.getSessionById(
        'js-arrays-map-vs-foreach-01',
      )) as ExerciseSession;
      const fixStep = session.steps.find((s) => s.type === 'fix-code');

      expect(Object.isFrozen(fixStep?.requirements)).toBe(true);
      expect(() => {
        (fixStep?.requirements as string[]).push('roto');
      }).toThrow(TypeError);
      const serialized = JSON.stringify(session);
      expect(serialized).not.toContain('"hints"');
      expect(serialized).not.toContain('"explanation"');
      expect(serialized).not.toContain('"testCases"');
      expect(serialized).not.toContain('"correct"');
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
      'js-arrays-coding-transform-01',
      'js-arrays-filter-mutation-01',
      'js-arrays-iteration-checkpoint-01',
      'js-arrays-iteration-quiz-01',
      'js-arrays-map-vs-foreach-01',
      'js-arrays-reduce-accumulator-01',
      'js-functions-default-parameters-01',
      'js-functions-return-flow-01',
      'js-functions-scope-hoisting-01',
      'js-functions-coding-format-name-01',
      'js-closures-loop-capture-01',
      'js-closures-shared-state-01',
      'js-closures-live-binding-01',
      'js-closures-coding-counter-01',
      'js-promises-chain-transform-01',
      'js-promises-error-recovery-01',
      'js-promises-await-value-01',
      'js-promises-coding-fetch-label-01',
      'js-objects-dynamic-properties-01',
      'js-objects-object-entries-01',
      'js-objects-shared-reference-01',
      'js-objects-coding-pick-01',
      'js-es6-destructuring-shapes-01',
      'js-es6-rest-arguments-01',
      'js-es6-nullish-defaults-01',
      'js-es6-coding-unique-tags-01',
      'js-errors-throw-validation-01',
      'js-errors-catch-context-01',
      'js-errors-finally-cleanup-01',
      'js-errors-coding-parse-number-01',
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
