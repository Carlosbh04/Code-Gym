import type { ContentContextValue, Technology } from '@/types/content';
import type { ExerciseSession } from '@/types/exercise';

export type SearchResultType =
  | 'technology'
  | 'topic'
  | 'concept'
  | 'session'
  | 'exercise';

export interface SearchResult {
  id: string;
  type: SearchResultType;
  title: string;
  technologyId: string;
  technologyName: string;
  technologyIcon: string;
  route: string;
  searchText: string;
}

const TYPE_ORDER: Record<SearchResultType, number> = {
  technology: 0,
  topic: 1,
  concept: 2,
  session: 3,
  exercise: 4,
};

export const SEARCH_RESULT_LABEL: Record<SearchResultType, string> = {
  technology: 'Tecnología',
  topic: 'Tema',
  concept: 'Concepto',
  session: 'Sesión',
  exercise: 'Ejercicio',
};

export function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function createResult(
  result: Omit<SearchResult, 'searchText'>,
  extraSearchText = '',
): SearchResult {
  return {
    ...result,
    searchText: normalizeSearchText(
      `${result.title} ${result.technologyName} ${extraSearchText}`,
    ),
  };
}

export async function buildSearchIndex(
  content: ContentContextValue,

  // SEARCH_CANONICAL_PRACTICE_GATE_MODEL
  canIncludeSession?:
    (
      session: ExerciseSession,
    ) => Promise<boolean>,
): Promise<SearchResult[]> {
  const catalogs = await Promise.all(
    content.technologies.map(async (technology) => {
      const topics = await content.getTopics(technology.id);
      const topicCatalogs = await Promise.all(
        topics.map(async (topic) => {
          const concepts = await content.getConceptsByTopic(topic.id);
          const conceptCatalogs = await Promise.all(
            concepts.map(
              async concept => {
                const publishedSessions =
                  (
                    await content
                      .getSessionsByConcept(
                        concept.id,
                      )
                  ).filter(
                    session =>
                      session.status
                      === 'published',
                  );

                const sessions =
                  canIncludeSession
                    === undefined
                    ? publishedSessions
                    : (
                        await Promise.all(
                          publishedSessions.map(
                            async session => ({
                              session,
                              allowed:
                                await canIncludeSession(
                                  session,
                                ),
                            }),
                          ),
                        )
                      )
                        .filter(
                          entry =>
                            entry.allowed,
                        )
                        .map(
                          entry =>
                            entry.session,
                        );

                return {
                  concept,
                  sessions,
                };
              },
            ),
          );

          return { topic, conceptCatalogs };
        }),
      );

      return { technology, topicCatalogs };
    }),
  );

  return catalogs.flatMap(({ technology, topicCatalogs }) => [
    technologyResult(technology),
    ...topicCatalogs.flatMap(({ topic, conceptCatalogs }) => [
      createResult(
        {
          id: `topic:${topic.id}`,
          type: 'topic',
          title: topic.name,
          technologyId: technology.id,
          technologyName: technology.name,
          technologyIcon: technology.icon,
          route: `/tech/${technology.id}/${topic.id}`,
        },
        topic.description,
      ),
      ...conceptCatalogs.flatMap(({ concept, sessions }) => [
        createResult({
          id: `concept:${concept.id}`,
          type: 'concept',
          title: concept.name,
          technologyId: technology.id,
          technologyName: technology.name,
          technologyIcon: technology.icon,
          route: `/tech/${technology.id}/${topic.id}`,
        }),
        ...sessions.flatMap((session) => [
          createResult({
            id: `session:${session.id}`,
            type: 'session',
            title: session.title,
            technologyId: technology.id,
            technologyName: technology.name,
            technologyIcon: technology.icon,
            route: `/practice/${session.id}`,
          }),
          ...session.steps.map((step) =>
            createResult(
              {
                id: `exercise:${session.id}:${step.id}`,
                type: 'exercise',
                title: step.prompt,
                technologyId: technology.id,
                technologyName: technology.name,
                technologyIcon: technology.icon,
                route: `/practice/${session.id}`,
              },
              session.title,
            ),
          ),
        ]),
      ]),
    ]),
  ]);
}

function technologyResult(technology: Technology): SearchResult {
  return createResult(
    {
      id: `technology:${technology.id}`,
      type: 'technology',
      title: technology.name,
      technologyId: technology.id,
      technologyName: technology.name,
      technologyIcon: technology.icon,
      route: `/tech/${technology.id}`,
    },
    technology.description,
  );
}

export function searchCatalog(
  index: readonly SearchResult[],
  query: string,
  limit = 10,
): SearchResult[] {
  const normalizedQuery = normalizeSearchText(query);
  if (normalizedQuery === '') return [];

  return index
    .map((result, position) => {
      const normalizedTitle = normalizeSearchText(result.title);
      const rank =
        normalizedTitle === normalizedQuery
          ? 0
          : normalizedTitle.startsWith(normalizedQuery)
            ? 1
            : result.searchText.includes(normalizedQuery)
              ? 2
              : -1;

      return { result, position, rank };
    })
    .filter((match) => match.rank >= 0)
    .sort(
      (left, right) =>
        left.rank - right.rank ||
        TYPE_ORDER[left.result.type] - TYPE_ORDER[right.result.type] ||
        left.position - right.position,
    )
    .slice(0, limit)
    .map(({ result }) => result);
}

export function getCatalogSuggestions(
  index: readonly SearchResult[],
  limit = 4,
): SearchResult[] {
  const suggestions: SearchResult[] = [];
  const preferredTypes: SearchResultType[] = [
    'technology',
    'technology',
    'topic',
    'session',
  ];
  const used = new Set<string>();

  for (const type of preferredTypes) {
    const result = index.find((candidate) =>
      candidate.type === type && !used.has(candidate.id),
    );
    if (result !== undefined) {
      suggestions.push(result);
      used.add(result.id);
    }
  }

  for (const result of index) {
    if (suggestions.length >= limit) break;
    if (!used.has(result.id)) {
      suggestions.push(result);
      used.add(result.id);
    }
  }

  return suggestions.slice(0, limit);
}
