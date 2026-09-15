import type { HomeTechnologyProgress } from '../home-types';
import { TechnologyCard } from './TechnologyCard';

type TechnologyGridVariant =
  | 'default'
  | 'quick-start'
  | 'onboarding';

export function TechnologyGrid({
  items,
  variant = 'default',
}: {
  items: HomeTechnologyProgress[];
  variant?: TechnologyGridVariant;
}) {
  const gridClassName =
    variant === 'quick-start'
      ? 'grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-6 xl:gap-3'
      : variant === 'onboarding'
        ? 'grid grid-cols-1 gap-4 min-[640px]:grid-cols-2 xl:grid-cols-3 xl:gap-x-5 xl:gap-y-4'
        : 'grid grid-cols-2 gap-3 xl:grid-cols-3';

  return (
    <ul className={gridClassName}>
      {items.map((item) => (
        <li
          key={item.technology.id}
          className="min-w-0"
        >
          <TechnologyCard
            item={item}
            variant={variant}
          />
        </li>
      ))}
    </ul>
  );
}
