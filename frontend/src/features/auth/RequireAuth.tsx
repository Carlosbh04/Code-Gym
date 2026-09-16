import {
  Navigate,
  Outlet,
  useLocation,
} from 'react-router-dom';

import {
  useAuth,
} from './AuthContext';

import { Skeleton } from '@/components/codegym/Skeleton';
export function RequireAuth() {
  const {
    status,
    isAuthenticated,
    accessToken,
  } =
    useAuth();

  const location =
    useLocation();

  if (
    status === 'loading'
    || (
      status === 'authenticated'
      && accessToken === null
    )
  ) {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-busy="true"
        className="min-h-screen bg-background"
      >
        <span className="sr-only">
          Comprobando sesión…
        </span>

        <div
          aria-hidden="true"
          className="min-h-screen sm:flex"
        >
          {/* Sidebar desktop */}
          <aside
            className="
              hidden
              min-h-screen
              shrink-0
              border-r
              border-border
              bg-card/40
              sm:flex
              sm:w-20
              sm:flex-col
              sm:items-center
              sm:px-3
              sm:py-5
              xl:w-60
              xl:items-stretch
              xl:px-4
            "
          >
            <Skeleton className="h-9 w-9 rounded-xl xl:w-28" />

            <div className="mt-9 space-y-3">
              {Array.from(
                { length: 4 },
                (_, index) => (
                  <div
                    key={index}
                    className="
                      flex
                      h-11
                      items-center
                      gap-3
                      rounded-xl
                      px-2
                    "
                  >
                    <Skeleton className="size-9 shrink-0 rounded-lg" />

                    <Skeleton className="hidden h-4 flex-1 xl:block" />
                  </div>
                ),
              )}
            </div>

            <div className="mt-auto space-y-3">
              <Skeleton className="h-10 rounded-xl" />
            </div>
          </aside>

          <div className="min-w-0 flex-1">
            <div
              className="
                mx-auto
                flex
                min-h-screen
                w-full
                max-w-[1440px]
                flex-col
              "
            >
              {/* TopBar */}
              <header
                className="
                  sticky
                  top-0
                  z-40
                  flex
                  h-14
                  w-full
                  shrink-0
                  items-center
                  border-b
                  border-border
                  bg-background/95
                  px-4
                  sm:h-16
                  sm:px-6
                  lg:px-8
                "
              >
                <Skeleton className="h-5 w-20 sm:hidden" />

                <div className="ml-auto flex min-w-0 items-center gap-2.5 sm:gap-3 md:ml-0 md:w-full">
                  {/* buscador móvil */}
                  <Skeleton className="size-11 rounded-xl md:hidden" />

                  {/* buscador desktop */}
                  <Skeleton className="hidden h-11 w-80 rounded-xl md:block lg:w-[28rem] xl:w-[30rem]" />

                  <span
                    className="
                      hidden
                      h-8
                      w-px
                      bg-border
                      md:ml-auto
                      md:block
                    "
                  />

                  {/* tema */}
                  <Skeleton className="size-10 rounded-xl" />

                  {/* usuario */}
                  <div className="flex items-center gap-2">
                    <Skeleton className="size-9 rounded-full" />

                    <div className="hidden space-y-1.5 lg:block">
                      <Skeleton className="h-3.5 w-20" />
                      <Skeleton className="h-3 w-28" />
                    </div>
                  </div>
                </div>
              </header>

              {/* contenido */}
              <main
                className="
                  flex-1
                  px-4
                  pb-28
                  pt-5
                  sm:px-6
                  sm:pb-8
                  sm:pt-6
                  md:px-7
                  lg:px-10
                  lg:pb-10
                  lg:pt-8
                  xl:px-12
                "
              >
                <div className="mx-auto w-full max-w-7xl py-2 sm:py-4">
                  <Skeleton className="h-4 w-24" />

                  <Skeleton className="mt-3 h-10 w-64 max-w-full sm:h-12" />

                  <Skeleton className="mt-3 h-4 w-full max-w-xl" />

                  <div className="mt-6 grid gap-5 lg:grid-cols-3">
                    <Skeleton className="h-40 rounded-2xl" />
                    <Skeleton className="h-40 rounded-2xl" />
                    <Skeleton className="h-40 rounded-2xl" />
                  </div>

                  <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(20rem,0.8fr)]">
                    <Skeleton className="h-72 rounded-2xl" />
                    <Skeleton className="h-72 rounded-2xl" />
                  </div>
                </div>
              </main>
            </div>
          </div>
        </div>

        {/* navegación móvil */}
        <div
          aria-hidden="true"
          className="
            fixed
            bottom-3
            left-3
            right-3
            z-40
            grid
            h-16
            grid-cols-4
            gap-2
            rounded-2xl
            border
            border-border
            bg-card
            p-2
            shadow-lg
            sm:hidden
          "
        >
          {Array.from(
            { length: 4 },
            (_, index) => (
              <div
                key={index}
                className="flex items-center justify-center"
              >
                <Skeleton className="size-9 rounded-lg" />
              </div>
            ),
          )}
        </div>
      </div>
    );
  }

  if (
    !isAuthenticated
    || accessToken === null
  ) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from:
            location.pathname,
        }}
      />
    );
  }

  return <Outlet />;
}