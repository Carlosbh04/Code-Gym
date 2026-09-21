import { readFileSync, readdirSync } from 'node:fs';
import { relative, sep } from 'node:path';
import { describe, expect, it } from 'vitest';
import { StaticContentRepository } from '@/lib/repositories/StaticContentRepository';
import type { Concept, LearningSection, Topic } from '@/types/content';
import type { ExerciseSession } from '@/types/exercise';

const CONTENT_ROOT = 'src/data/content';

function findFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = `${directory}/${entry.name}`;
    return entry.isDirectory() ? findFiles(path) : [path];
  });
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

const contentFiles = findFiles(CONTENT_ROOT);
const conceptIndexFiles = contentFiles.filter((path) => {
  const segments = relative(CONTENT_ROOT, path).split(sep);
  return segments.length === 3 && segments[2] === 'index.json';
});
const sessionFiles = contentFiles.filter((path) =>
  path.endsWith('.json') && relative(CONTENT_ROOT, path).split(sep).includes('sessions'),
);

interface RawAnswerOption {
  readonly id: string;
  readonly text: string;
  readonly correct?: unknown;
}

interface RawExerciseStep {
  readonly id: string;
  readonly type: string;
  readonly code: string | null;
  readonly options: readonly RawAnswerOption[] | null;
  readonly errorLines?: readonly number[] | null;
  readonly errorType?: string | null;
}

interface RawExerciseSession {
  readonly id: string;
  readonly steps: readonly RawExerciseStep[];
}

const FIND_ERROR_TEXT_SIGNALS: Readonly<Record<string, RegExp>> = {
  aliasing: /alias|referencia compartida/i,
  assignment: /asigna|reasigna|binding|const/i,
  'assignment-to-constant': /asigna|reasigna|const/i,
  async: /async|await|promise/i,
  conceptual: /conceptual|tipo|direcci[oó]n|acceso|rest|perfil|propiedad|shallow|rama|fallback|desestructur/i,
  concurrencia: /concurr|paralel|comienza|termina/i,
  condicion: /condici[oó]n|truthiness|falsy|filtro/i,
  contextual: /context|causa|cause|error original|error capturado/i,
  contrato: /contrato|clasific|identificador|se[nñ]al|categor[ií]a|fulfilled|rejected|rechazo|catch/i,
  control: /control|recursi[oó]n|l[ií]mite|intentos/i,
  'copia-superficial': /copia superficial|spread|anidad|propiedad/i,
  estado: /estado|global|comparte|fuera de la f[aá]brica/i,
  'estado-compartido': /estado compartido|global|compart|instancia|f[aá]brica/i,
  existencia: /existencia|propiedad existente|truthiness|falsy/i,
  flow: /flujo|return|devolv/i,
  flujo: /flujo|return|retorn|devuel|propag|promise|finally|lanzar|catch|resultado/i,
  'información': /informaci[oó]n|reason|texto gen[eé]rico/i,
  logico: /l[oó]gic|valor v[aá]lido|clave din[aá]mica|object\.keys|valores/i,
  mutacion: /mutaci[oó]n|referencia|objeto original|anidado|spread/i,
  precedencia: /precedencia|sobrescrib/i,
  'referencia-viva': /referencia viva|cada llamada|creaci[oó]n/i,
  scope: /scope|binding|oculta|tdz|bloque|exterior|iteraci[oó]n|captur|variable viva/i,
  'shared-reference': /referencia compartida|alias|copia/i,
  'temporal-dead-zone': /temporal dead zone|antes de inicializar|binding local/i,
};

const VALID_SECTION_TYPES = new Set<LearningSection['type']>([
  'intro', 'objectives', 'explanation', 'code', 'key-point', 'warning', 'comparison', 'quick-check',
]);

function assertStructuredLearning(concept: Concept): void {
  expect(concept.content, `${concept.id} necesita teoría estructurada`).toBeDefined();
  const sections = concept.content?.sections ?? [];
  expect(sections.length, `${concept.id} necesita bloques pedagógicos`).toBeGreaterThanOrEqual(4);

  for (const section of sections) {
    expect(VALID_SECTION_TYPES.has(section.type), `${concept.id}: ${section.type}`).toBe(true);
    if (section.type === 'objectives') {
      expect(section.items.length, `${concept.id}: objetivos`).toBeGreaterThan(0);
    }
    if (section.type === 'code') {
      expect(section.code.trim(), `${concept.id}: ejemplo de código`).not.toBe('');
      expect(section.language.trim(), `${concept.id}: lenguaje de ejemplo`).not.toBe('');
    }
    if (section.type === 'quick-check') {
      expect(section.question.trim(), `${concept.id}: pregunta`).not.toBe('');
      expect(section.answer.trim(), `${concept.id}: respuesta`).not.toBe('');
    }
  }
}

describe('contenido publicado (T070)', () => {
  it('mantiene seleccionables todos los find-error de JavaScript', () => {
    const javascriptSessionFiles = sessionFiles.filter(
      (path) => relative(CONTENT_ROOT, path).split(sep)[0] === 'javascript',
    );
    const sessions = javascriptSessionFiles.map((path) =>
      readJson<RawExerciseSession>(path),
    );
    const steps = sessions.flatMap((session) =>
      session.steps.map((step) => ({ sessionId: session.id, step })),
    );
    const findErrorSteps = steps.filter(({ step }) => step.type === 'find-error');
    const fixCodeSteps = steps.filter(({ step }) => step.type === 'fix-code');

    expect(sessions).toHaveLength(126);
    expect(steps).toHaveLength(487);
    expect(findErrorSteps).toHaveLength(88);
    expect(fixCodeSteps).toHaveLength(85);

    for (const { sessionId, step } of findErrorSteps) {
      const label = `${sessionId}/${step.id}`;
      const code = step.code ?? '';
      const options = step.options ?? [];
      const errorLines = step.errorLines ?? [];
      const errorType = step.errorType ?? '';

      expect(code.trim(), `${label}: code`).not.toBe('');
      expect(errorLines.length, `${label}: errorLines`).toBeGreaterThan(0);
      expect(
        errorLines.every(
          (line) => Number.isSafeInteger(line) && line > 0 && line <= code.split('\n').length,
        ),
        `${label}: errorLines válidas`,
      ).toBe(true);
      expect(errorType.trim(), `${label}: errorType`).not.toBe('');
      expect(options.length, `${label}: options`).toBeGreaterThan(0);
      expect(
        new Set(options.map((option) => option.id)).size,
        `${label}: option.id únicos`,
      ).toBe(options.length);

      for (const option of options) {
        expect(option.id.trim(), `${label}: option.id`).not.toBe('');
        expect(option.text.trim(), `${label}/${option.id}: option.text`).not.toBe('');
      }

      const selectableMatches = options.filter(
        (option) => option.id === errorType,
      );
      expect(
        selectableMatches,
        `${label}: debe existir una única opción seleccionable para errorType=${errorType}`,
      ).toHaveLength(1);
      expect(
        selectableMatches[0]?.text.trim(),
        `${label}: texto de la opción correcta`,
      ).not.toBe('');
      const textSignal = FIND_ERROR_TEXT_SIGNALS[errorType];
      expect(textSignal, `${label}: señal semántica para ${errorType}`).toBeDefined();
      expect(
        textSignal?.test(selectableMatches[0]?.text ?? ''),
        `${label}: texto coherente con errorType=${errorType}`,
      ).toBe(true);
    }
  });

  // Recorre todos los módulos de contenido reales. En la suite paralela, los
  // imports dinámicos comparten CPU con los tests de UI; el límite es local
  // para no alterar el presupuesto de tiempo del resto de la suite.
  it('carga todo el grafo físico desde tecnologías hasta cada sesión', async () => {
    const repository = new StaticContentRepository();
    const loadedConceptIds: string[] = [];
    const loadedSessionIds: string[] = [];
    const technologies = await repository.getTechnologies();
    const technologyIds = technologies.map((technology) => technology.id);
    const contentTechnologyIds = readdirSync(CONTENT_ROOT, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);

    expect(technologies.length).toBeGreaterThan(0);
    expect(new Set(technologyIds).size).toBe(technologyIds.length);
    expect(new Set(contentTechnologyIds)).toEqual(new Set(technologyIds));

    for (const technology of technologies) {
      const topics = await repository.getTopicsByTechnology(technology.id);
      expect(topics.length, technology.id).toBeGreaterThan(0);
      expect(new Set(topics.map((topic) => topic.id)).size, technology.id).toBe(topics.length);

      const physicalTopics = readJson<Topic[]>(`${CONTENT_ROOT}/${technology.id}/index.json`);
      expect(topics.map((topic) => topic.id), technology.id).toEqual(
        physicalTopics.map((topic) => topic.id),
      );

      for (const topic of topics) {
        expect(topic.technologyId, topic.id).toBe(technology.id);
        expect(topic.name.trim(), topic.id).not.toBe('');
        expect(topic.description.trim(), topic.id).not.toBe('');

        const concepts = await repository.getConceptsByTopic(topic.id);
        expect(concepts.length, topic.id).toBeGreaterThan(0);

        for (const concept of concepts) {
          loadedConceptIds.push(concept.id);
          expect(concept.technologyId, concept.id).toBe(technology.id);
          expect(concept.topicId, concept.id).toBe(topic.id);
          expect(concept.contentMarkdown.trim(), concept.id).not.toBe('');
          assertStructuredLearning(concept);
          expect(await repository.getConceptById(concept.id), concept.id).toBe(concept);

          const sessions = await repository.getSessionsByConcept(concept.id);
          expect(sessions.length, concept.id).toBeGreaterThan(0);

          for (const session of sessions) {
            loadedSessionIds.push(session.id);
            expect(session.conceptId, session.id).toBe(concept.id);
            expect(session.technologyId, session.id).toBe(technology.id);
            expect(session.steps.length, session.id).toBeGreaterThan(0);
            expect(session.title.trim(), session.id).not.toBe('');
            expect(new Set(session.steps.map((step) => step.id)).size, session.id).toBe(
              session.steps.length,
            );
            expect(session.steps.map((step) => step.stepOrder), session.id).toEqual(
              session.steps.map((_, index) => index + 1),
            );
            for (const step of session.steps) {
              expect(step.prompt.trim(), `${session.id}/${step.id}`).not.toBe('');
              expect(step.hintCount, `${session.id}/${step.id}`).toBeGreaterThan(0);
              const serialized = JSON.stringify(step);
              expect(serialized).not.toContain('"hints"');
              expect(serialized).not.toContain('"explanation"');
              expect(serialized).not.toContain('"correct"');
            }
          }
        }
      }
    }

    const physicalConceptIds = conceptIndexFiles.map((path) =>
      readJson<Pick<Concept, 'id'>>(path).id,
    );
    const physicalSessionIds = sessionFiles.map((path) =>
      readJson<Pick<ExerciseSession, 'id'>>(path).id,
    );

    expect(new Set(loadedConceptIds)).toEqual(new Set(physicalConceptIds));
    expect(loadedConceptIds).toHaveLength(physicalConceptIds.length);
    expect(new Set(loadedSessionIds)).toEqual(new Set(physicalSessionIds));
    expect(loadedSessionIds).toHaveLength(physicalSessionIds.length);
  }, 10_000);
});
