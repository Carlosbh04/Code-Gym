import { describe, expect, it, vi } from 'vitest';
import type { Concept, Technology, Topic } from '@/types/content';
import type { ExerciseSession } from '@/types/exercise';
import type { CompletedSession, ConceptProgress } from '@/types/progress';
import { createReviewHubModel, loadReviewCatalog, type ReviewCatalog } from './review-hub-model';

const TECHNOLOGY: Technology = { id: 'javascript', name: 'JavaScript', icon: 'javascript', description: '' };
const TOPIC: Topic = { id: 'arrays', name: 'Arrays', technologyId: TECHNOLOGY.id, description: '' };
const WEAK: Concept = { id: 'weak', name: 'Iteración', topicId: TOPIC.id, technologyId: TECHNOLOGY.id, contentMarkdown: '' };
const LOW_EVIDENCE: Concept = { id: 'low-evidence', name: 'Reduce', topicId: TOPIC.id, technologyId: TECHNOLOGY.id, contentMarkdown: '' };
const STRONG: Concept = { id: 'strong', name: 'Filter', topicId: TOPIC.id, technologyId: TECHNOLOGY.id, contentMarkdown: '' };

function session(id: string, conceptId: string): ExerciseSession {
  return {
    id,
    title: `Sesión ${id}`,
    conceptId,
    technologyId: TECHNOLOGY.id,
    difficulty: 'beginner',
    version: '1',
    status: 'published',
    createdAt: '2026-09-01T10:00:00.000Z',
    updatedAt: null,
    steps: [],
  };
}

function completion(sessionId: string, conceptId: string, accuracy: number): CompletedSession {
  return {
    id: `completion-${sessionId}`,
    sessionId,
    technologyId: TECHNOLOGY.id,
    conceptId,
    totalSteps: 10,
    correctSteps: Math.round(accuracy / 10),
    accuracy,
    timeSpentMs: 60_000,
    completedAt: '2026-09-06T10:00:00.000Z',
  };
}

function conceptProgress(conceptId: string, totalAttempts: number, correctAttempts: number, lastPracticed: string): ConceptProgress {
  return {
    conceptId,
    domain: 0,
    totalAttempts,
    correctAttempts,
    difficultyDistribution: {
      beginner: { total: totalAttempts, correct: correctAttempts },
      intermediate: { total: 0, correct: 0 },
      advanced: { total: 0, correct: 0 },
    },
    recentErrors: [],
    lastPracticed,
    schemaVersion: 1,
  };
}

const WEAK_SESSION = session('weak-session', WEAK.id);
const LOW_SESSION = session('low-session', LOW_EVIDENCE.id);
const STRONG_SESSION = session('strong-session', STRONG.id);
const LOW_COMPLETION = completion(LOW_SESSION.id, LOW_EVIDENCE.id, 70);
const STRONG_COMPLETION = completion(STRONG_SESSION.id, STRONG.id, 100);

const CATALOG: ReviewCatalog = {
  concepts: [WEAK, LOW_EVIDENCE, STRONG].map((concept) => ({ technology: TECHNOLOGY, topic: TOPIC, concept })),
  sessions: [
    { technology: TECHNOLOGY, topic: TOPIC, concept: WEAK, session: WEAK_SESSION, completion: null },
    { technology: TECHNOLOGY, topic: TOPIC, concept: LOW_EVIDENCE, session: LOW_SESSION, completion: LOW_COMPLETION },
    { technology: TECHNOLOGY, topic: TOPIC, concept: STRONG, session: STRONG_SESSION, completion: STRONG_COMPLETION },
  ],
  completionErrors: 0,
};

describe('review hub model', () => {
  it('ordena conceptos por precisión y evidencia y excluye los ya consolidados', () => {
    const progress = new Map([
      [WEAK.id, conceptProgress(WEAK.id, 4, 2, '2026-09-05T10:00:00.000Z')],
      [LOW_EVIDENCE.id, conceptProgress(LOW_EVIDENCE.id, 6, 3, '2026-09-01T10:00:00.000Z')],
      [STRONG.id, conceptProgress(STRONG.id, 10, 9, '2026-09-02T10:00:00.000Z')],
    ]);

    const model = createReviewHubModel({ catalog: CATALOG, progress, recentCompletedSessions: [], recovery: null });

    expect(model.overview).toEqual({
      accuracy: 70,
      evidenceLevel: 'sufficient',
      totalAttempts: 20,
      completedSessions: 0,
    });
    expect(model.reviewConcepts.map(({ concept }) => concept.id)).toEqual([WEAK.id, LOW_EVIDENCE.id]);
    expect(model.priorityConcepts.map(({ concept }) => concept.id)).toEqual([WEAK.id, LOW_EVIDENCE.id]);
    expect(model.priorityConcepts[0]).toMatchObject({ accuracy: 50, evidenceLevel: 'initial' });
  });

  it('no recomienda reforzar un concepto al 100% aunque la evidencia sea inicial', () => {
    const progress = new Map([
      [
        STRONG.id,
        conceptProgress(
          STRONG.id,
          4,
          4,
          '2026-09-14T16:00:00.000Z',
        ),
      ],
    ]);

    const model = createReviewHubModel({
      catalog: CATALOG,
      progress,
      recentCompletedSessions: [],
      recovery: null,
    });

    expect(
      model.reviewConcepts.map(
        ({ concept }) => concept.id,
      ),
    ).not.toContain(STRONG.id);

    expect(
      model.priorityConcepts.map(
        ({ concept }) => concept.id,
      ),
    ).not.toContain(STRONG.id);

    expect(
      model.recommendedSessions.some(
        ({ concept }) => concept.id === STRONG.id,
      ),
    ).toBe(false);
  });

  it('prioriza recovery, precisión baja y sesiones pendientes sin duplicarlas', () => {
    const progress = new Map([
      [WEAK.id, conceptProgress(WEAK.id, 4, 2, '2026-09-05T10:00:00.000Z')],
      [LOW_EVIDENCE.id, conceptProgress(LOW_EVIDENCE.id, 6, 3, '2026-09-01T10:00:00.000Z')],
    ]);

    const model = createReviewHubModel({
      catalog: CATALOG,
      progress,
      recentCompletedSessions: [LOW_COMPLETION],
      recovery: { sessionId: WEAK_SESSION.id, currentStep: 2 },
    });

    expect(model.recommendedSessions.map(({ session, status, reason }) => ({ id: session.id, status, reason }))).toEqual([
      { id: WEAK_SESSION.id, status: 'in-progress', reason: 'recovery' },
      { id: LOW_SESSION.id, status: 'completed', reason: 'low-accuracy' },
    ]);
    expect(model.recommendedSessions[0]?.currentStep).toBe(2);
    expect(model.recentActivity[0]).toMatchObject({ session: { id: LOW_SESSION.id }, completedSession: LOW_COMPLETION });
    expect(model.hasActivity).toBe(true);
  });

  it('mantiene solo la finalización más reciente de una sesión repetida', () => {
    const older = {
      ...LOW_COMPLETION,
      id: 'completion-old',
      accuracy: 70,
      completedAt: '2026-09-06T10:00:00.000Z',
    };

    const latest = {
      ...LOW_COMPLETION,
      id: 'completion-latest',
      accuracy: 100,
      completedAt: '2026-09-07T10:00:00.000Z',
    };

    const model = createReviewHubModel({
      catalog: CATALOG,
      progress: new Map([
        [
          LOW_EVIDENCE.id,
          conceptProgress(
            LOW_EVIDENCE.id,
            12,
            11,
            '2026-09-07T10:00:00.000Z',
          ),
        ],
      ]),
      recentCompletedSessions: [older, latest],
      recovery: null,
    });

    expect(model.recentActivity).toHaveLength(1);
    expect(model.recentActivity[0]?.completedSession.id).toBe(
      'completion-latest',
    );
    expect(model.overview.completedSessions).toBe(1);
  });

  it('produce un estado vacío real sin progreso, historial ni recovery', () => {
    const emptyCatalog: ReviewCatalog = {
      ...CATALOG,
      sessions: CATALOG.sessions.map((item) => ({ ...item, completion: null })),
    };
    const model = createReviewHubModel({ catalog: emptyCatalog, progress: new Map(), recentCompletedSessions: [], recovery: null });

    expect(model).toMatchObject({
      overview: {
        accuracy: undefined,
        evidenceLevel: 'none',
        totalAttempts: 0,
        completedSessions: 0,
      },
      reviewConcepts: [],
      priorityConcepts: [],
      recommendedSessions: [],
      recentActivity: [],
      hasActivity: false,
    });
  });

  it('carga solo sesiones publicadas y conserva errores de historial como dato explícito', async () => {
    const draft = { ...STRONG_SESSION, id: 'draft', status: 'draft' as const };
    const getCompletedSession = vi.fn(async (sessionId: string) => {
      if (sessionId === LOW_SESSION.id) throw new Error('historial no disponible');
      return sessionId === WEAK_SESSION.id ? completion(WEAK_SESSION.id, WEAK.id, 60) : null;
    });

    const catalog = await loadReviewCatalog({
      technologies: [TECHNOLOGY],
      getTopics: vi.fn().mockResolvedValue([TOPIC]),
      getConceptsByTopic: vi.fn().mockResolvedValue([WEAK, LOW_EVIDENCE]),
      getSessionsByConcept: vi.fn(async (conceptId: string) => conceptId === WEAK.id ? [WEAK_SESSION, draft] : [LOW_SESSION]),
      getCompletedSession,
    });

    expect(catalog.sessions.map(({ session: item }) => item.id)).toEqual([WEAK_SESSION.id, LOW_SESSION.id]);
    expect(catalog.sessions[0]?.completion?.accuracy).toBe(60);
    expect(catalog.sessions[1]?.completion).toBeNull();
    expect(catalog.completionErrors).toBe(1);
  });
});
