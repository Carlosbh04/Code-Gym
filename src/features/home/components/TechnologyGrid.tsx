import type { Technology } from '@/types/content';
import { TechnologyCard } from './TechnologyCard';

export function TechnologyGrid({ technologies, topicCounts }: { technologies: Technology[]; topicCounts: ReadonlyMap<string, number> }) {
  return <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">{technologies.map((technology) => <li key={technology.id} className="min-w-0"><TechnologyCard technology={technology} topicCount={topicCounts.get(technology.id)} /></li>)}</ul>;
}
