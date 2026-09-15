import { calculateAccuracy, getEvidenceLevel, type EvidenceLevel } from '@/features/dashboard/dashboard-view-model';
import type { SessionRecoverySnapshot } from '@/lib/recovery/ISessionRecoveryStore';
import type { Concept, ContentContextValue, Technology, Topic } from '@/types/content';
import type { ExerciseSession } from '@/types/exercise';
import type { HistoryContextValue } from '@/types/history';
import type { CompletedSession, ProgressSummary } from '@/types/progress';

export interface ReviewCatalogSession {
  technology: Technology;
  topic: Topic;
  concept: Concept;
  session: ExerciseSession;
  completion: CompletedSession | null;
}

export interface ReviewCatalog {
  sessions: ReviewCatalogSession[];
  concepts: Array<{ technology: Technology; topic: Topic; concept: Concept }>;
  completionErrors: number;
}

export interface ReviewConceptItem {
  technology: Technology;
  topic: Topic;
  concept: Concept;
  progress: ProgressSummary;
  accuracy: number;
  evidenceLevel: EvidenceLevel;
}

export type ReviewSessionStatus = 'in-progress' | 'completed' | 'pending';

export interface ReviewSessionItem extends ReviewCatalogSession {
  status: ReviewSessionStatus;
  reason: 'recovery' | 'low-accuracy' | 'priority' | 'fallback';
  currentStep: number | null;
  conceptAccuracy: number | undefined;
  conceptEvidenceLevel: EvidenceLevel;
  conceptAttempts: number;
}

export interface ReviewActivityItem extends ReviewCatalogSession {
  completedSession: CompletedSession;
}

export interface ReviewHubModel {
  overview: {
    accuracy: number | undefined;
    evidenceLevel: EvidenceLevel;
    totalAttempts: number;
    completedSessions: number;
  };
  reviewConcepts: ReviewConceptItem[];
  priorityConcepts: ReviewConceptItem[];
  recommendedSessions: ReviewSessionItem[];
  recentActivity: ReviewActivityItem[];
  hasActivity: boolean;
}

interface CatalogTechnology {
  technology: Technology;
  topics: Array<{
    topic: Topic;
    concepts: Array<{ concept: Concept; sessions: ExerciseSession[] }>;
  }>;
}

export async function loadReviewCatalog({
  technologies,
  getTopics,
  getConceptsByTopic,
  getSessionsByConcept,
  getCompletedSession,
}: {
  technologies: Technology[];
  getTopics: ContentContextValue['getTopics'];
  getConceptsByTopic: ContentContextValue['getConceptsByTopic'];
  getSessionsByConcept: ContentContextValue['getSessionsByConcept'];
  getCompletedSession: HistoryContextValue['getCompletedSession'];
}): Promise<ReviewCatalog> {
  const catalog = await Promise.all(
    technologies.map(async (technology): Promise<CatalogTechnology> => {
      const topics = await getTopics(technology.id);
      return {
        technology,
        topics: await Promise.all(topics.map(async (topic) => {
          const concepts = await getConceptsByTopic(topic.id);
          return {
            topic,
            concepts: await Promise.all(concepts.map(async (concept) => ({
              concept,
              sessions: (await getSessionsByConcept(concept.id)).filter(
                (session) => session.status === 'published',
              ),
            }))),
          };
        })),
      };
    }),
  );
  const concepts = catalog.flatMap(({ technology, topics }) =>
    topics.flatMap(({ topic, concepts: items }) =>
      items.map(({ concept }) => ({ technology, topic, concept })),
    ),
  );
  const sessionsWithoutCompletion = catalog.flatMap(({ technology, topics }) =>
    topics.flatMap(({ topic, concepts: items }) =>
      items.flatMap(({ concept, sessions }) =>
        sessions.map((session) => ({ technology, topic, concept, session })),
      ),
    ),
  );
  const completionEntries = await Promise.all(
    sessionsWithoutCompletion.map(async (item) => {
      try {
        return { item, completion: await getCompletedSession(item.session.id), error: false } as const;
      } catch {
        return { item, completion: null, error: true } as const;
      }
    }),
  );

  return {
    concepts,
    sessions: completionEntries.map(({ item, completion }) => ({ ...item, completion })),
    completionErrors: completionEntries.filter(({ error }) => error).length,
  };
}

export function createReviewHubModel({
  catalog,
  progress,
  recentCompletedSessions,
  recovery,
}: {
  catalog: ReviewCatalog;
  progress: ReadonlyMap<string, ProgressSummary>;
  recentCompletedSessions: readonly CompletedSession[];
  recovery: Pick<SessionRecoverySnapshot, 'sessionId' | 'currentStep'> | null;
}): ReviewHubModel {
  const totals = [...progress.values()].reduce(
    (current, item) => ({
      attempts: current.attempts + item.totalAttempts,
      correct: current.correct + item.correctAttempts,
    }),
    { attempts: 0, correct: 0 },
  );
  const reviewConcepts = catalog.concepts
    .flatMap(({ technology, topic, concept }): ReviewConceptItem[] => {
      const conceptProgress = progress.get(concept.id);
      if (conceptProgress === undefined || conceptProgress.totalAttempts <= 0) return [];
      const accuracy = calculateAccuracy(
        conceptProgress.correctAttempts,
        conceptProgress.totalAttempts,
      );
      const evidenceLevel = getEvidenceLevel(conceptProgress.totalAttempts);
      if (accuracy === undefined || accuracy >= 80) return [];
      return [{ technology, topic, concept, progress: conceptProgress, accuracy, evidenceLevel }];
    })
    .sort(compareConceptPriority);
  const priorityConcepts = reviewConcepts.slice(0, 4);
  const priorityIds = new Set(priorityConcepts.map(({ concept }) => concept.id));
  const candidates: ReviewSessionItem[] = [];

  const recoverySession = recovery === null
    ? undefined
    : catalog.sessions.find(({ session }) => session.id === recovery.sessionId);
  if (recoverySession !== undefined) {
    candidates.push(toReviewSessionItem(
      recoverySession,
      'in-progress',
      'recovery',
      recovery?.currentStep ?? null,
      progress,
    ));
  }

  for (const item of [...catalog.sessions]
    .filter(({ completion }) => completion !== null && completion.accuracy < 80)
    .sort((left, right) => {
      const byAccuracy = (left.completion?.accuracy ?? 100) - (right.completion?.accuracy ?? 100);
      if (byAccuracy !== 0) return byAccuracy;
      return (left.completion?.completedAt ?? '').localeCompare(right.completion?.completedAt ?? '');
    })) {
    candidates.push(toReviewSessionItem(item, 'completed', 'low-accuracy', null, progress));
  }

  for (const item of catalog.sessions.filter(
    ({ concept, completion }) => priorityIds.has(concept.id) && completion === null,
  )) {
    candidates.push(toReviewSessionItem(item, 'pending', 'priority', null, progress));
  }

  for (const priority of priorityConcepts) {
    const fallback = catalog.sessions.find(({ concept }) => concept.id === priority.concept.id);
    if (fallback !== undefined) {
      candidates.push(toReviewSessionItem(
        fallback,
        fallback.completion === null ? 'pending' : 'completed',
        'fallback',
        null,
        progress,
      ));
    }
  }

  const recommendedSessions = uniqueBySession(candidates).slice(0, 4);
  const sessionById = new Map(catalog.sessions.map((item) => [item.session.id, item]));
  const latestCompletionBySession = new Map<string, CompletedSession>();

  for (const completedSession of [...recentCompletedSessions]
    .sort((left, right) => right.completedAt.localeCompare(left.completedAt))) {
    if (!latestCompletionBySession.has(completedSession.sessionId)) {
      latestCompletionBySession.set(completedSession.sessionId, completedSession);
    }
  }

  const recentActivity = [...latestCompletionBySession.values()]
    .flatMap((completedSession): ReviewActivityItem[] => {
      const item = sessionById.get(completedSession.sessionId);
      return item === undefined ? [] : [{ ...item, completedSession }];
    });

  return {
    overview: {
      accuracy: calculateAccuracy(totals.correct, totals.attempts),
      evidenceLevel: getEvidenceLevel(totals.attempts),
      totalAttempts: totals.attempts,
      completedSessions: latestCompletionBySession.size,
    },
    reviewConcepts,
    priorityConcepts,
    recommendedSessions,
    recentActivity,
    hasActivity:
      [...progress.values()].some(({ totalAttempts }) => totalAttempts > 0) ||
      recentCompletedSessions.length > 0 ||
      catalog.sessions.some(({ completion }) => completion !== null) ||
      recoverySession !== undefined,
  };
}

function toReviewSessionItem(
  item: ReviewCatalogSession,
  status: ReviewSessionStatus,
  reason: ReviewSessionItem['reason'],
  currentStep: number | null,
  progress: ReadonlyMap<string, ProgressSummary>,
): ReviewSessionItem {
  const conceptProgress = progress.get(item.concept.id);
  const conceptAttempts = conceptProgress?.totalAttempts ?? 0;
  return {
    ...item,
    status,
    reason,
    currentStep,
    conceptAccuracy: conceptProgress === undefined
      ? undefined
      : calculateAccuracy(conceptProgress.correctAttempts, conceptAttempts),
    conceptEvidenceLevel: getEvidenceLevel(conceptAttempts),
    conceptAttempts,
  };
}

function compareConceptPriority(left: ReviewConceptItem, right: ReviewConceptItem): number {
  const byAccuracy = left.accuracy - right.accuracy;
  if (byAccuracy !== 0) return byAccuracy;
  const byEvidence = left.progress.totalAttempts - right.progress.totalAttempts;
  if (byEvidence !== 0) return byEvidence;
  const byLastPracticed = left.progress.lastPracticed.localeCompare(right.progress.lastPracticed);
  if (byLastPracticed !== 0) return byLastPracticed;
  return left.concept.id.localeCompare(right.concept.id);
}

function uniqueBySession(items: ReviewSessionItem[]): ReviewSessionItem[] {
  const unique = new Map<string, ReviewSessionItem>();
  for (const item of items) {
    if (!unique.has(item.session.id)) unique.set(item.session.id, item);
  }
  return [...unique.values()];
}
