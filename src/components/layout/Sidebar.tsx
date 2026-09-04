import { NavLink } from 'react-router-dom';

import { NAV_ITEMS } from '@/components/layout/navigation';
import { cn } from '@/lib/utils';

export function Sidebar() {
  return (
    <aside
      aria-label="Barra lateral"
      className="
        hidden
        min-h-screen
        shrink-0
        flex-col
        border-r
        border-border
        bg-background

        sm:flex
        sm:w-20

        lg:w-64
      "
    >
      <div
        className="
          flex
          h-16
          items-center
          justify-center
          border-b
          border-border
          px-3

          lg:justify-start
          lg:px-6
        "
      >
        <span
          className="
            hidden
            text-lg
            font-bold
            tracking-tight
            text-primary

            lg:inline
          "
        >
          CodeGym
        </span>

        <span
          aria-hidden="true"
          className="
            text-lg
            font-bold
            tracking-tight
            text-primary

            lg:hidden
          "
        >
          CG
        </span>
      </div>

      <nav
        aria-label="Navegación principal"
        className="
          flex
          flex-1
          flex-col
          px-2
          py-4

          lg:px-3
        "
      >
        <ul className="flex flex-col gap-1.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;

            return (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.to === '/'}
                  title={item.label}
                  className={({ isActive }) =>
                    cn(
                      `
                        group
                        flex
                        min-h-11
                        items-center
                        justify-center
                        rounded-lg
                        px-3
                        text-sm
                        font-medium
                        transition-colors
                        duration-fast
                        ease-standard

                        focus-visible:outline-none
                        focus-visible:ring-2
                        focus-visible:ring-ring
                        focus-visible:ring-offset-2
                        focus-visible:ring-offset-background

                        lg:justify-start
                        lg:gap-3
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
                    className="
                      h-5
                      w-5
                      shrink-0
                      transition-transform
                      duration-fast
                      ease-standard

                      group-hover:scale-105
                    "
                    aria-hidden="true"
                  />

                  <span className="hidden lg:inline">{item.label}</span>

                  <span className="sr-only lg:hidden">{item.label}</span>
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}