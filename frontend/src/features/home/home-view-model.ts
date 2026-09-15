import type { ContentContextValue, Technology } from '@/types/content';
import type { HistoryContextValue } from '@/types/history';
import type { SessionRecoverySnapshot } from '@/lib/recovery/ISessionRecoveryStore';
import type { ProgressContextValue } from '@/types/progress';
import type { ExerciseSession } from '@/types/exercise';
import { createDashboardViewModel } from '@/features/dashboard/dashboard-view-model';
import type {
  HomeActivity,
  HomeCatalog,
  HomeCatalogTechnology,
  HomeContinueItem,
  HomeTechnologyProgress,
} from './home-types';

export async function loadHomeCatalog({
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
}): Promise<HomeCatalog> {
  const catalog = await Promise.all(
    technologies.map(async (technology): Promise<HomeCatalogTechnology> => {
      const topics = await getTopics(technology.id);
      const conceptsByTopic = await Promise.all(
        topics.map((topic) => getConceptsByTopic(topic.id)),
      );
      const sessionsByConcept = await Promise.all(
        conceptsByTopic.flat().map((concept) => getSessionsByConcept(concept.id)),
      );
      let sessionIndex = 0;
      const sessions = topics.flatMap((topic, topicIndex) =>
        (conceptsByTopic[topicIndex] ?? []).flatMap((concept) => {
          const conceptSessions = sessionsByConcept[sessionIndex] ?? [];
          sessionIndex += 1;
          return conceptSessions
            .filter((session) => session.status === 'published')
            .map((session) => ({ session, concept, topic }));
        }),
      );

      return {
        technology,
        topics,
        concepts: conceptsByTopic.flat(),
        sessions,
      };
    }),
  );
  const completionEntries = await Promise.all(
    catalog.flatMap((item) => item.sessions).map(async ({ session }) => {
      try {
        return {
          sessionId: session.id,
          completedSession: await getCompletedSession(session.id),
          error: false,
        } as const;
      } catch {
        return {
          sessionId: session.id,
          completedSession: null,
          error: true,
        } as const;
      }
    }),
  );

  return {
    technologies: catalog,
    completionBySession: new Map(
      completionEntries
        .filter((entry) => !entry.error)
        .map((entry) => [entry.sessionId, entry.completedSession]),
    ),
    completionErrors: completionEntries.filter((entry) => entry.error).length,
  };
}

export function selectHomeContinueItem(
  catalog: HomeCatalog,
  progress: ProgressContextValue['progress'],
  recovery: SessionRecoverySnapshot | null,
): HomeContinueItem | null {
  const sessions = catalog.technologies.flatMap(({ technology, sessions: items }) =>
    items.map((item) => ({ ...item, technology })),
  );
  const recoveryItem = recovery === null
    ? undefined
    : sessions.find(({ session }) => session.id === recovery.sessionId);
  if (recovery !== null && recoveryItem !== undefined) {
    return {
      ...recoveryItem,
      state: 'in-progress',
      completedSteps: Math.min(
        recovery.answers.length,
        recoveryItem.session.steps.length,
      ),
      source: 'recovery',
    };
  }

  const dashboard = createDashboardViewModel(progress.values());
  const recommendedConcept = dashboard.priorityConcept ??
    [...dashboard.observedConcepts].sort((left, right) =>
      right.lastPracticed.localeCompare(left.lastPracticed),
    )[0];
  const isKnownAvailable = (session: ExerciseSession) =>
    catalog.completionBySession.has(session.id) &&
    catalog.completionBySession.get(session.id) === null;
  const recommended = recommendedConcept === undefined
    ? undefined
    : sessions.find(({ concept, session }) =>
      concept.id === recommendedConcept.conceptId &&
      isKnownAvailable(session),
    );
  const available = recommended ?? sessions.find(({ session }) =>
    isKnownAvailable(session),
  );
  if (available !== undefined) {
    return {
      ...available,
      state: 'available',
      completedSteps: 0,
      source: recommended === undefined ? 'available' : 'recommended',
    };
  }

  const repeat = sessions.find(({ session }) =>
    catalog.completionBySession.get(session.id) !== null &&
    catalog.completionBySession.get(session.id) !== undefined,
  );

  if (repeat !== undefined) {
    return {
      ...repeat,
      state: 'completed',
      completedSteps: repeat.session.steps.length,
      source: 'repeat',
    };
  }

  /*
   * Una sesión publicada puede no aparecer en completionBySession
   * cuando la consulta individual de historial falló.
   *
   * Eso no convierte la sesión en completada ni inventa progreso.
   * Simplemente permite ofrecer una sesión real y publicada del
   * catálogo en lugar de mostrar falsamente un estado vacío.
   */
  const catalogFallback = sessions.find(
    ({ session }) =>
      !catalog.completionBySession.has(session.id),
  );

  return catalogFallback === undefined
    ? null
    : {
        ...catalogFallback,
        state: 'available',
        completedSteps: 0,
        source: 'available',
      };
}

export function createTechnologyProgress(
  catalog: HomeCatalog,
  progress: ProgressContextValue['progress'],
): HomeTechnologyProgress[] {
  return catalog.technologies.map(({ technology, concepts }) => ({
    technology,
    totalConcepts: concepts.length,
    practicedConcepts: concepts.filter(
      (concept) => (progress.get(concept.id)?.totalAttempts ?? 0) > 0,
    ).length,
  }));
}

export function createHomeActivities(
  catalog: HomeCatalog,
  completedSessions: HistoryContextValue['recentCompletedSessions'],
): HomeActivity[] {
  const sessions = catalog.technologies.flatMap(({ technology, sessions: items }) =>
    items.map((item) => ({ ...item, technology })),
  );
  return [...completedSessions]
    .sort((left, right) => right.completedAt.localeCompare(left.completedAt))
    .map((completedSession) => {
      const match = sessions.find(({ session }) => session.id === completedSession.sessionId);
      const catalogTechnology = catalog.technologies.find(
        ({ technology }) => technology.id === completedSession.technologyId,
      );
      return {
        completedSession,
        sessionTitle: match?.session.title ?? completedSession.sessionId,
        technologyId: completedSession.technologyId,
        technologyName:
          match?.technology.name ??
          catalogTechnology?.technology.name ??
          completedSession.technologyId,
        topicName: match?.topic.name,
      };
    });
}
