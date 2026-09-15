import type { Concept, ContentContextValue, Topic } from '@/types/content';
import type { ExerciseSession } from '@/types/exercise';
import type { HistoryContextValue } from '@/types/history';
import type { ProgressContextValue } from '@/types/progress';
import type { TopicInsight } from './components/TopicList';
import type { CompletionLookup } from './session-status';

export interface NextPractice {
  session: ExerciseSession;
  isRepeat: boolean;
}

export interface TechnologyViewModel {
  technologyId: string;
  topics: Topic[];
  insights: ReadonlyMap<string, TopicInsight>;
  completedConcepts: number;
  totalConcepts: number;
  practicedConcepts: number;
  sessions: TechnologySessionItem[];
  completionErrors: number;
  nextPractice: NextPractice | null;
}

export interface TechnologySessionItem {
  topic: Topic;
  concept: Concept;
  session: ExerciseSession;
  completion: CompletionLookup;
}

interface TopicCatalog {
  topic: Topic;
  concepts: Concept[];
  sessionsByConcept: ExerciseSession[][];
}

export async function buildTechnologyViewModel({
  technologyId,
  getTopics,
  getConceptsByTopic,
  getSessionsByConcept,
  getCompletedSession,
  progress,
}: {
  technologyId: string;
  getTopics: ContentContextValue['getTopics'];
  getConceptsByTopic: ContentContextValue['getConceptsByTopic'];
  getSessionsByConcept: ContentContextValue['getSessionsByConcept'];
  getCompletedSession: HistoryContextValue['getCompletedSession'];
  progress: ProgressContextValue['progress'];
}): Promise<TechnologyViewModel> {
  const topics = await getTopics(technologyId);
  const catalog = await Promise.all(
    topics.map(async (topic): Promise<TopicCatalog> => {
      const concepts = await getConceptsByTopic(topic.id);
      const sessionsByConcept = await Promise.all(
        concepts.map((concept) => getSessionsByConcept(concept.id)),
      );
      return { topic, concepts, sessionsByConcept };
    }),
  );
  const sessions = catalog.flatMap(({ topic, concepts, sessionsByConcept }) =>
    concepts.flatMap((concept, index) =>
      (sessionsByConcept[index] ?? [])
        .filter((session) => session.status === 'published')
        .map((session) => ({ topic, concept, session })),
    ),
  );
  const completions = await Promise.all(
    sessions.map(async ({ session }): Promise<readonly [string, CompletionLookup]> => {
      try {
        const completedSession = await getCompletedSession(session.id);
        return [session.id, {
          status: 'ready',
          completedSession:
            completedSession?.technologyId === technologyId
              ? completedSession
              : null,
        }];
      } catch (error: unknown) {
        return [session.id, {
          status: 'error',
          message:
            error instanceof Error
              ? error.message
              : 'No se pudo leer el historial de esta sesión.',
        }];
      }
    }),
  );
  const completionBySession = new Map(completions);
  const completedSessionIds = new Set(
    completions.flatMap(([sessionId, completion]) =>
      completion.status === 'ready' && completion.completedSession !== null
        ? [sessionId]
        : [],
    ),
  );
  const completedConceptIds = new Set(
    completions.flatMap(([, completion]) =>
      completion.status === 'ready' && completion.completedSession !== null
        ? [completion.completedSession.conceptId]
        : [],
    ),
  );
  const insights = new Map(
    catalog.map(({ topic, concepts, sessionsByConcept }) => [
      topic.id,
      createTopicInsight(
        concepts,
        sessionsByConcept,
        progress,
        completedSessionIds,
      ),
    ]),
  );
  const totalConcepts = [...insights.values()].reduce(
    (total, insight) => total + insight.conceptCount,
    0,
  );
  const completedConcepts = [...insights.values()].reduce(
    (total, insight) => total + insight.completedConcepts,
    0,
  );
  const practicedConceptIds = new Set(
    catalog.flatMap(({ concepts }) => concepts.flatMap((concept) =>
      (progress.get(concept.id)?.totalAttempts ?? 0) > 0 ||
      completedConceptIds.has(concept.id)
        ? [concept.id]
        : [],
    )),
  );
  const publishedSessions = sessions.map(({ session }) => session);
  const nextSession =
    publishedSessions.find((session) => !completedSessionIds.has(session.id)) ??
    publishedSessions[0];

  return {
    technologyId,
    topics,
    insights,
    completedConcepts,
    totalConcepts,
    practicedConcepts: practicedConceptIds.size,
    sessions: sessions.map((item) => ({
      ...item,
      completion: completionBySession.get(item.session.id) ?? {
        status: 'error',
        message: 'No se pudo comprobar el historial de esta sesión.',
      },
    })),
    completionErrors: completions.filter(([, completion]) => completion.status === 'error').length,
    nextPractice:
      nextSession === undefined
        ? null
        : {
            session: nextSession,
            isRepeat: publishedSessions.every((session) =>
              completedSessionIds.has(session.id),
            ),
          },
  };
}

function createTopicInsight(
  concepts: Concept[],
  sessionsByConcept: ExerciseSession[][],
  progress: ProgressContextValue['progress'],
  completedSessionIds: ReadonlySet<string>,
): TopicInsight {
  const publishedByConcept = sessionsByConcept.map((sessions) =>
    sessions.filter((session) => session.status === 'published'),
  );
  const publishedSessions = publishedByConcept.flat();
  const exerciseCount = publishedSessions.reduce(
    (total, session) => total + session.steps.length,
    0,
  );
  const practicedConcepts = concepts.filter(
    (concept) => (progress.get(concept.id)?.totalAttempts ?? 0) > 0,
  ).length;
  const completedConcepts = publishedByConcept.filter(
    (sessions) =>
      sessions.length > 0 &&
      sessions.every((session) => completedSessionIds.has(session.id)),
  ).length;
  const completedSessions = publishedSessions.filter((session) =>
    completedSessionIds.has(session.id),
  ).length;
  const status =
    concepts.length > 0 && completedConcepts === concepts.length
      ? 'completed'
      : practicedConcepts > 0 || completedSessions > 0
        ? 'in-progress'
        : 'pending';

  return {
    exerciseCount,
    conceptCount: concepts.length,
    completedConcepts,
    practicedConcepts,
    status,
  };
}
