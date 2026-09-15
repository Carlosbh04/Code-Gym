import { BarChart3, Code2, ListTree, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

export type TechnologyTab = 'topics' | 'exercises' | 'results';

const TABS: Array<{ id: TechnologyTab; label: string; icon: LucideIcon }> = [
  { id: 'topics', label: 'Temas', icon: ListTree },
  { id: 'exercises', label: 'Ejercicios', icon: Code2 },
  { id: 'results', label: 'Resultados', icon: BarChart3 },
];

interface TechnologyTabsProps {
  technologyId: string;
  activeTab: TechnologyTab;
}

export function TechnologyTabs({ technologyId, activeTab }: TechnologyTabsProps) {
  return (
    <nav aria-label="Secciones de tecnología" className="mt-5 border-b border-border sm:mt-6">
      <div className="flex min-w-0 gap-1 overflow-x-auto">
        {TABS.map(({ id, label, icon: Icon }) => {
          const active = id === activeTab;
          return (
            <Link
              key={id}
              to={`/tech/${technologyId}?tab=${id}`}
              aria-current={active ? 'page' : undefined}
              className={`inline-flex min-h-12 shrink-0 items-center gap-2 border-b-2 px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset ${
                active
                  ? 'border-primary font-semibold text-primary'
                  : 'border-transparent font-medium text-muted-foreground hover:border-border hover:text-foreground'
              }`}
            >
              <Icon className="size-4" aria-hidden="true" />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
