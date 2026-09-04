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
              expect(step.explanation.trim(), `${session.id}/${step.id}`).not.toBe('');
              expect(step.hints.length, `${session.id}/${step.id}`).toBeGreaterThan(0);
              if (step.type === 'code-reading' || step.type === 'predict-output') {
                expect(step.options?.filter((option) => option.correct)).toHaveLength(1);
              }
            }
            expect(await repository.getSessionById(session.id), session.id).toBe(session);
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
  });
});
