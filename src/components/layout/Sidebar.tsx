import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { NAV_ITEMS } from '@/components/layout/navigation';

export function Sidebar() {
  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-background lg:flex">
      <div className="flex h-16 items-center px-6">
        <span className="text-lg font-bold text-primary">CodeGym</span>
      </div>
      <nav aria-label="Navegación principal" className="flex-1 px-3 py-4">
        <ul className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                    )
                  }
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                  <span>{item.label}</span>
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
