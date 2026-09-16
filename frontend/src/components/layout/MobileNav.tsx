import { NavLink } from 'react-router-dom';

import { NAV_ITEMS } from '@/components/layout/navigation';

import './mobile-nav.css';
import { cn } from '@/lib/utils';

export function MobileNav() {
  return (
    <nav
      aria-label="Navegación principal"
      className="
        fixed
        inset-x-0
        bottom-0
        z-50
        sm:hidden
      "
    >
      <div
        className="
          codegym-mobile-nav-shell
          border-t
          border-border
          bg-background/95
          px-2
          pt-2
          shadow-[0_-14px_40px_rgba(0,0,0,0.30)]
          backdrop-blur-xl
        "
      >
        <ul
          style={{ gridTemplateColumns: `repeat(${NAV_ITEMS.length}, minmax(0, 1fr))` }}
          className="
            codegym-mobile-nav-list
            relative
            grid
            min-h-[4.5rem]
            items-center
            gap-0
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
                        codegym-mobile-nav-link
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
                        ? 'text-foreground'
                        : `
                          text-muted-foreground
                          hover:text-foreground
                        `,
                    )
                  }
                >
                  <span
                    aria-hidden="true"
                    className="codegym-mobile-nav-link__lift"
                  />

                  <span
                    aria-hidden="true"
                    className="codegym-mobile-nav-link__glow"
                  />

                  <span
                    aria-hidden="true"
                    className="codegym-mobile-nav-link__ring"
                  />

                  <Icon
                    aria-hidden="true"
                    className="
                      codegym-mobile-nav-link__icon
                      h-5
                      w-5
                      shrink-0
                    "
                  />

                  <span
                    className="
                      codegym-mobile-nav-link__label
                      max-w-full
                      truncate
                    "
                  >
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
