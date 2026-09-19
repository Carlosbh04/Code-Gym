import type { Concept, ContentContextValue, Topic } from '@/types/content';
import type {
  ConceptLearningState,
  LearningLevelId,
  LearningLevelState,
} from '@/features/learning/learning-types';
import {
  canEnterLearningSession,
} from '@/features/learning/session-learning-kind';
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

  /*
   * Todas las sesiones publicadas.
   * Se conservan para resultados e historial.
   */
  sessions: TechnologySessionItem[];

  /*
   * TECHNOLOGY_PRACTICE_CANONICAL_GATE_MODEL
   *
   * Solo sesiones que pueden abrir /practice.
   */
  practiceSessions: TechnologySessionItem[];

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

type ConceptLearningLookup =
  | {
      status: 'ready';
      state: ConceptLearningState;
    }
  | {
      status: 'error';
      message: string;
    };

export async function buildTechnologyViewModel({
  technologyId,
  getTopics,
  getConceptsByTopic,
  getSessionsByConcept,
  getCompletedSession,
  progress,
  getConceptLearningState,
  getSessionLearningState,
}: {
  technologyId: string;
  getTopics: ContentContextValue['getTopics'];
  getConceptsByTopic: ContentContextValue['getConceptsByTopic'];
  getSessionsByConcept: ContentContextValue['getSessionsByConcept'];
  getCompletedSession: HistoryContextValue['getCompletedSession'];
  progress: ProgressContextValue['progress'];

  getConceptLearningState?:
    (
      conceptId: string,
    ) => Promise<ConceptLearningState>;

  getSessionLearningState?:
    (
      conceptId: string,
      levelId: LearningLevelId,
    ) => Promise<LearningLevelState>;
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
  // CANONICAL_CONCEPT_COMPLETION
  const concepts =
    catalog.flatMap(
      item =>
        item.concepts,
    );

  const conceptLearningEntries =
    getConceptLearningState === undefined
      ? []
      : await Promise.all(
          concepts.map(
            async (
              concept,
            ): Promise<
              readonly [
                string,
                ConceptLearningLookup,
              ]
            > => {
              try {
                const state =
                  await getConceptLearningState(
                    concept.id,
                  );

                return [
                  concept.id,
                  {
                    status:
                      'ready',
                    state,
                  },
                ];
              } catch (
                error:
                  unknown
              ) {
                return [
                  concept.id,
                  {
                    status:
                      'error',
                    message:
                      error instanceof Error
                        ? error.message
                        : 'No se pudo comprobar el progreso del concepto.',
                  },
                ];
              }
            },
          ),
        );

  const learningByConcept =
    new Map(
      conceptLearningEntries,
    );

  const sessions = catalog.flatMap(({ topic, concepts, sessionsByConcept }) =>
    concepts.flatMap((concept, index) =>
      (sessionsByConcept[index] ?? [])
        .filter((session) => session.status === 'published')
        .map((session) => ({ topic, concept, session })),
    ),
  );
  // TECHNOLOGY_LEVEL_STATE_REQUEST_DEDUPE
  const sessionLearningStateRequests =
    new Map<
      string,
      Promise<LearningLevelState>
    >();

  // TECHNOLOGY_PRACTICE_CANONICAL_GATE_MODEL
  const practiceAccessEntries =
    await Promise.all(
      sessions.map(
        async (
          { session },
        ): Promise<
          readonly [
            string,
            boolean,
          ]
        > => {
          /*
           * Compatibilidad legacy:
           * una sesión sin levelId conserva
           * el comportamiento existente.
           */
          if (
            session.levelId
            === undefined
          ) {
            return [
              session.id,
              true,
            ];
          }

          /*
           * Staged falla cerrado si TechnologyPage
           * no dispone de autoridad canónica.
           */
          if (
            getSessionLearningState
            === undefined
          ) {
            return [
              session.id,
              false,
            ];
          }

          try {
            const requestKey =
              `${session.conceptId}\u0000${session.levelId}`;

            let levelStateRequest =
              sessionLearningStateRequests.get(
                requestKey,
              );

            if (
              levelStateRequest
              === undefined
            ) {
              levelStateRequest =
                getSessionLearningState(
                  session.conceptId,
                  session.levelId,
                );

              sessionLearningStateRequests.set(
                requestKey,
                levelStateRequest,
              );
            }

            const levelState =
              await levelStateRequest;

            return [
              session.id,
              canEnterLearningSession(
                session,
                levelState,
              ),
            ];
          } catch {
            return [
              session.id,
              false,
            ];
          }
        },
      ),
    );

  const practiceAccessBySession =
    new Map(
      practiceAccessEntries,
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
        learningByConcept,
        getConceptLearningState !== undefined,
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
  const practiceSessions =
    sessions.filter(
      ({ session }) =>
        practiceAccessBySession.get(
          session.id,
        ) === true,
    );

  const availablePracticeSessions =
    practiceSessions.map(
      ({ session }) =>
        session,
    );

  const nextSession =
    availablePracticeSessions.find(
      session =>
        !completedSessionIds.has(
          session.id,
        ),
    )
    ?? availablePracticeSessions[0];

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

    practiceSessions:
      practiceSessions.map(
        item => ({
          ...item,
          completion:
            completionBySession.get(
              item.session.id,
            )
            ?? {
              status:
                'error',
              message:
                'No se pudo comprobar el historial de esta sesión.',
            },
        }),
      ),
    completionErrors:
      completions.filter(
        ([, completion]) =>
          completion.status
          === 'error',
      ).length
      + conceptLearningEntries.filter(
        ([, learning]) =>
          learning.status
          === 'error',
      ).length,
    nextPractice:
      nextSession === undefined
        ? null
        : {
            session: nextSession,
            isRepeat:
              availablePracticeSessions.every(
                session =>
                  completedSessionIds.has(
                    session.id,
                  ),
              ),
          },
  };
}

function createTopicInsight(
  concepts: Concept[],
  sessionsByConcept: ExerciseSession[][],
  progress: ProgressContextValue['progress'],
  completedSessionIds: ReadonlySet<string>,
  learningByConcept:
    ReadonlyMap<
      string,
      ConceptLearningLookup
    >,
  useCanonicalCompletion:
    boolean,
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
  const legacyCompletedConcepts =
    publishedByConcept.filter(
      sessions =>
        sessions.length > 0
        && sessions.every(
          session =>
            completedSessionIds.has(
              session.id,
            ),
        ),
    ).length;

  const canonicalCompletedConcepts =
    concepts.filter(
      concept => {
        const learning =
          learningByConcept.get(
            concept.id,
          );

        return (
          learning?.status
            === 'ready'
          && learning.state.completed
        );
      },
    ).length;

  const completedConcepts =
    useCanonicalCompletion
      ? canonicalCompletedConcepts
      : legacyCompletedConcepts;

  const completedSessions =
    publishedSessions.filter(
      session =>
        completedSessionIds.has(
          session.id,
        ),
    ).length;

  const canonicalActivity =
    concepts.some(
      concept => {
        const learning =
          learningByConcept.get(
            concept.id,
          );

        if (
          learning?.status
          !== 'ready'
        ) {
          return false;
        }

        return Object.values(
          learning.state.stages,
        ).some(
          stage =>
            stage.status
            === 'completed',
        );
      },
    );

  const status =
    concepts.length > 0
    && completedConcepts
      === concepts.length
      ? 'completed'
      : canonicalActivity
        || practicedConcepts > 0
        || completedSessions > 0
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
