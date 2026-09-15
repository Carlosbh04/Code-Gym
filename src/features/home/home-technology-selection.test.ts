import { describe, expect, it } from 'vitest';
import type { SessionRecoverySnapshot } from '@/lib/recovery/ISessionRecoveryStore';
import type { Concept, Technology, Topic } from '@/types/content';
import type { ExerciseSession } from '@/types/exercise';
import type { CompletedSession, ConceptProgress } from '@/types/progress';
import type { HomeCatalog, HomeTechnologyProgress } from './home-types';
import {
  createHomeDiscoverySeed,
  HOME_TECHNOLOGY_LIMIT,
  selectHomeTechnologies,
} from './home-technology-selection';

function createFixture(count: number) {
  const technologies: Technology[] = Array.from({ length: count }, (_, index) => ({
    id: `technology-${index + 1}`,
    name: `Technology ${index + 1}`,
    icon: `T${index + 1}`,
    description: `Technology ${index + 1} description`,
  }));
  const catalogTechnologies = technologies.map((technology) => {
    const topic: Topic = {
      id: `${technology.id}-topic`,
      name: `${technology.name} topic`,
      technologyId: technology.id,
      description: 'Topic description',
    };
    const concept: Concept = {
      id: `${technology.id}-concept`,
      name: `${technology.name} concept`,
      topicId: topic.id,
      technologyId: technology.id,
      contentMarkdown: '',
    };
    const session: ExerciseSession = {
      id: `${technology.id}-session`,
      title: `${technology.name} session`,
      conceptId: concept.id,
      technologyId: technology.id,
      difficulty: 'beginner',
      version: '1.0.0',
      status: 'published',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: null,
      steps: [],
    };
    return {
      technology,
      topics: [topic],
      concepts: [concept],
      sessions: [{ session, concept, topic }],
    };
  });
  const catalog: HomeCatalog = {
    technologies: catalogTechnologies,
    completionBySession: new Map(),
    completionErrors: 0,
  };
  const items: HomeTechnologyProgress[] = technologies.map((technology) => ({
    technology,
    totalConcepts: 1,
    practicedConcepts: 0,
  }));

  return { catalog, items };
}

function createProgress(
  technologyNumber: number,
  totalAttempts: number,
  lastPracticed = '2026-09-01T10:00:00.000Z',
): ConceptProgress {
  return {
    conceptId: `technology-${technologyNumber}-concept`,
    domain: 0,
    totalAttempts,
    correctAttempts: 0,
    difficultyDistribution: {
      beginner: { total: totalAttempts, correct: 0 },
      intermediate: { total: 0, correct: 0 },
      advanced: { total: 0, correct: 0 },
    },
    recentErrors: [],
    lastPracticed,
    schemaVersion: 1,
  };
}

function technologyIds(items: HomeTechnologyProgress[]) {
  return items.map(({ technology }) => technology.id);
}

describe('selectHomeTechnologies', () => {
  it('mantiene el orden canónico cuando el catálogo cabe completo', () => {
    const { catalog, items } = createFixture(6);

    const selected = selectHomeTechnologies({
      items,
      catalog,
      progress: new Map(),
      recovery: null,
      discoverySeed: '2026-09-07',
    });

    expect(technologyIds(selected)).toEqual(technologyIds(items));
  });

  it('limita un catálogo amplio a seis tecnologías de forma determinista', () => {
    const { catalog, items } = createFixture(9);
    const input = {
      items,
      catalog,
      progress: new Map<string, ConceptProgress>(),
      recovery: null,
      discoverySeed: '2026-09-07',
    };

    const first = selectHomeTechnologies(input);
    const second = selectHomeTechnologies(input);

    expect(first).toHaveLength(HOME_TECHNOLOGY_LIMIT);
    expect(technologyIds(second)).toEqual(technologyIds(first));
  });

  it('prioriza intentos reales y usa recencia y orden canónico para desempatar', () => {
    const { catalog, items } = createFixture(8);
    const progress = new Map([
      ['technology-1-concept', createProgress(1, 2)],
      ['technology-2-concept', createProgress(2, 7, '2026-09-01T10:00:00.000Z')],
      ['technology-3-concept', createProgress(3, 7, '2026-09-06T10:00:00.000Z')],
      ['technology-4-concept', createProgress(4, 7, '2026-09-06T10:00:00.000Z')],
    ]);

    const selected = selectHomeTechnologies({
      items,
      catalog,
      progress,
      recovery: null,
      discoverySeed: '2026-09-07',
    });

    expect(technologyIds(selected).slice(0, 4)).toEqual([
      'technology-3',
      'technology-4',
      'technology-2',
      'technology-1',
    ]);
  });

  it('coloca primero la tecnología con recovery aunque otra tenga más intentos', () => {
    const { catalog, items } = createFixture(8);
    const recovery: SessionRecoverySnapshot = {
      sessionId: 'technology-8-session',
      currentStep: 0,
      answers: [],
      elapsedMs: 0,
      revealedHints: [],
      startTime: 1,
    };

    const selected = selectHomeTechnologies({
      items,
      catalog,
      progress: new Map([['technology-1-concept', createProgress(1, 100)]]),
      recovery,
      discoverySeed: '2026-09-07',
    });

    expect(technologyIds(selected).slice(0, 2)).toEqual(['technology-8', 'technology-1']);
  });

  it('reconoce completados reales como actividad aunque no exista ConceptProgress', () => {
    const { catalog, items } = createFixture(8);
    const completion: CompletedSession = {
      id: 'completion-6',
      sessionId: 'technology-6-session',
      technologyId: 'technology-6',
      conceptId: 'technology-6-concept',
      totalSteps: 1,
      correctSteps: 1,
      accuracy: 100,
      timeSpentMs: 1_000,
      completedAt: '2026-09-06T10:00:00.000Z',
    };
    catalog.completionBySession = new Map([[completion.sessionId, completion]]);

    const selected = selectHomeTechnologies({
      items,
      catalog,
      progress: new Map(),
      recovery: null,
      discoverySeed: '2026-09-07',
    });

    expect(selected[0]?.technology.id).toBe('technology-6');
  });

  it('muestra solo las seis actividades con más intentos cuando hay más de seis activas', () => {
    const { catalog, items } = createFixture(8);
    const progress = new Map(
      Array.from({ length: 8 }, (_, index) => {
        const technologyNumber = index + 1;
        return [
          `technology-${technologyNumber}-concept`,
          createProgress(technologyNumber, technologyNumber),
        ];
      }),
    );

    const selected = selectHomeTechnologies({
      items,
      catalog,
      progress,
      recovery: null,
      discoverySeed: '2026-09-07',
    });

    expect(technologyIds(selected)).toEqual([
      'technology-8',
      'technology-7',
      'technology-6',
      'technology-5',
      'technology-4',
      'technology-3',
    ]);
  });

  it('rota solo el descubrimiento al cambiar el día y conserva la prioridad activa', () => {
    const { catalog, items } = createFixture(9);
    const input = {
      items,
      catalog,
      progress: new Map([['technology-1-concept', createProgress(1, 2)]]),
      recovery: null,
    };
    const firstDay = selectHomeTechnologies({
      ...input,
      discoverySeed: '2026-09-07',
    });
    const nextDay = selectHomeTechnologies({
      ...input,
      discoverySeed: '2026-09-08',
    });

    expect(firstDay[0]?.technology.id).toBe('technology-1');
    expect(nextDay[0]?.technology.id).toBe('technology-1');
    expect(technologyIds(nextDay).slice(1)).not.toEqual(technologyIds(firstDay).slice(1));
  });
});

describe('createHomeDiscoverySeed', () => {
  it('crea una semilla YYYY-MM-DD con la fecha local', () => {
    expect(createHomeDiscoverySeed(new Date(2026, 8, 7, 23, 45))).toBe('2026-09-07');
  });
});
