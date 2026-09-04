import { NavLink } from 'react-router-dom';

import { NAV_ITEMS } from '@/components/layout/navigation';
import { cn } from '@/lib/utils';

/** Navegación horizontal funcional para tablet y desktop. */
export function TopBar() {
  return (
    <header className="sticky top-0 z-40 hidden h-16 border-b border-border bg-background/95 px-6 backdrop-blur sm:flex sm:items-center lg:px-10">
      <nav aria-label="Navegación principal" className="flex min-w-0 items-center gap-1">
        <span className="mr-5 text-sm font-bold tracking-tight text-primary lg:hidden">CodeGym</span>
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.to === '/'} className={({ isActive }) => cn('inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-medium transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background', isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent hover:text-foreground')}>
            {item.label}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}
