import type { Concept, ContentContextValue, Technology, Topic } from '@/types/content';
import type { ProgressContextValue } from '@/types/progress';

export interface TrainingCatalogItem {
  technology: Technology;
  topics: Topic[];
  concepts: Concept[];
}

export interface TrainingTechnologyItem extends TrainingCatalogItem {
  practicedConcepts: number;
  percentage: number;
}

export interface TrainingTechnologyGroups {
  web: TrainingTechnologyItem[];
  advanced: TrainingTechnologyItem[];
  other: TrainingTechnologyItem[];
}

const WEB_TECHNOLOGY_IDS = ['javascript', 'html', 'css'] as const;
const ADVANCED_TECHNOLOGY_IDS = ['react', 'nodejs', 'sql'] as const;

export async function loadTrainingCatalog({
  technologies,
  getTopics,
  getConceptsByTopic,
}: {
  technologies: Technology[];
  getTopics: ContentContextValue['getTopics'];
  getConceptsByTopic: ContentContextValue['getConceptsByTopic'];
}): Promise<TrainingCatalogItem[]> {
  return Promise.all(
    technologies.map(async (technology) => {
      const topics = await getTopics(technology.id);
      const concepts = (
        await Promise.all(topics.map((topic) => getConceptsByTopic(topic.id)))
      ).flat();
      return { technology, topics, concepts };
    }),
  );
}

export function createTrainingTechnologyItems(
  catalog: TrainingCatalogItem[],
  progress: ProgressContextValue['progress'],
): TrainingTechnologyItem[] {
  return catalog.map((item) => {
    const practicedConcepts = item.concepts.filter(
      (concept) => (progress.get(concept.id)?.totalAttempts ?? 0) > 0,
    ).length;
    return {
      ...item,
      practicedConcepts,
      percentage: item.concepts.length === 0
        ? 0
        : Math.round((practicedConcepts / item.concepts.length) * 100),
    };
  });
}

export function groupTrainingTechnologies(
  items: TrainingTechnologyItem[],
): TrainingTechnologyGroups {
  const byId = new Map(items.map((item) => [item.technology.id, item]));
  const knownIds = new Set<string>([
    ...WEB_TECHNOLOGY_IDS,
    ...ADVANCED_TECHNOLOGY_IDS,
  ]);
  return {
    web: WEB_TECHNOLOGY_IDS.flatMap((id) => {
      const item = byId.get(id);
      return item === undefined ? [] : [item];
    }),
    advanced: ADVANCED_TECHNOLOGY_IDS.flatMap((id) => {
      const item = byId.get(id);
      return item === undefined ? [] : [item];
    }),
    other: items.filter((item) => !knownIds.has(item.technology.id)),
  };
}
