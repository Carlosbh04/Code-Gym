import { NavLink } from 'react-router-dom';

import { NAV_ITEMS } from '@/components/layout/navigation';
import { cn } from '@/lib/utils';

export function Sidebar() {
  return (
    <aside
      aria-label="Barra lateral"
      className="
        hidden
        sticky
        top-0
        z-30
        h-dvh
        shrink-0
        self-start
        flex-col
        overflow-y-auto
        border-r
        border-border
        bg-card/30

        sm:flex
        sm:w-20

        xl:w-60
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
          px-2

          xl:justify-start
          xl:px-5
        "
      >
        <span
          className="
            hidden
            text-lg
            font-bold
            tracking-tight
            text-primary

            xl:inline
          "
          aria-label="CodeGym"
        >
          <span className="text-foreground">Code</span>
          <span>Gym</span>
        </span>

        <span
          aria-hidden="true"
          className="
            text-lg
            font-bold
            tracking-tight
            text-primary

            xl:hidden
          "
          aria-label="CodeGym"
        >
          <span className="text-foreground">C</span>
          <span>G</span>
        </span>
      </div>

      <nav
        aria-label="Navegación principal"
        className="
          flex
          flex-1
          flex-col
          px-2
          py-3

          xl:px-3
        "
      >
        <ul className="flex flex-col gap-1">
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
                        relative
                        rounded-lg
                        px-2.5
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

                        xl:justify-start
                        xl:gap-3
                        xl:px-3
                      `,
                      isActive
                        ? `
                          bg-primary/[0.08]
                          text-primary
                          before:absolute
                          before:left-0
                          before:top-1/2
                          before:h-6
                          before:w-0.5
                          before:-translate-y-1/2
                          before:rounded-full
                          before:bg-primary
                          hover:bg-primary/[0.08]
                        `
                        : `
                          text-muted-foreground
                          hover:bg-muted/40
                          hover:text-foreground
                        `,
                    )
                  }
                >
                  <Icon
                    className="
                      size-[1.375rem]
                      shrink-0
                      transition-colors
                      duration-fast
                      ease-standard
                    "
                    aria-hidden="true"
                  />

                  <span className="hidden xl:inline">{item.label}</span>

                  <span className="sr-only xl:hidden">{item.label}</span>
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
