import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { NAV_ITEMS } from '@/components/layout/navigation';

export function TopBar() {
  return (
    <nav
      aria-label="Navegación principal"
      className="sticky top-0 z-40 hidden h-16 w-full items-center border-b border-border bg-background px-6 sm:flex lg:hidden"
    >
      <span className="mr-8 text-lg font-bold text-primary">CodeGym</span>
      <ul className="flex items-center gap-6">
        {NAV_ITEMS.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                cn(
                  'text-sm font-medium transition-colors',
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground',
                )
              }
            >
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
