import { NavLink } from 'react-router-dom';

import { NAV_ITEMS } from '@/components/layout/navigation';
import { cn } from '@/lib/utils';

export function MobileNav() {
  return (
    <nav
      aria-label="Navegación principal"
      className="
        fixed
        inset-x-3
        bottom-3
        z-50
        sm:hidden
      "
    >
      <div
        className="
          rounded-2xl
          border
          border-border
          bg-background/95
          px-2
          shadow-lg
          backdrop-blur
        "
      >
        <ul
          style={{ gridTemplateColumns: `repeat(${NAV_ITEMS.length}, minmax(0, 1fr))` }}
          className="
            grid
            min-h-16
            items-center
            gap-1
            pb-[env(safe-area-inset-bottom)]
          "
        >
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;

            return (
              <li key={item.to} className="min-w-0">
                <NavLink
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    cn(
                      `
                        group
                        flex
                        min-h-14
                        w-full
                        flex-col
                        items-center
                        justify-center
                        gap-1
                        rounded-xl
                        px-1
                        py-2
                        text-[11px]
                        font-medium
                        transition-colors
                        duration-fast
                        ease-standard

                        focus-visible:outline-none
                        focus-visible:ring-2
                        focus-visible:ring-ring
                        focus-visible:ring-offset-2
                        focus-visible:ring-offset-background
                      `,
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : `
                          text-muted-foreground
                          hover:bg-accent
                          hover:text-foreground
                        `,
                    )
                  }
                >
                  <Icon
                    aria-hidden="true"
                    className="
                      h-5
                      w-5
                      shrink-0
                      transition-transform
                      duration-fast
                      ease-standard

                      group-active:scale-95
                    "
                  />

                  <span className="max-w-full truncate">
                    {item.label}
                  </span>
                </NavLink>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
