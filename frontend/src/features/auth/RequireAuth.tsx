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
      <main
        role="status"
        aria-live="polite"
        aria-busy="true"
        className="min-h-screen bg-background"
      >
        <span className="sr-only">Comprobando sesión…</span>

        <div
          aria-hidden="true"
          className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-5 sm:px-6 lg:px-8"
        >
          <div className="flex min-h-14 items-center justify-between border-b border-border">
            <Skeleton className="h-8 w-28" />
            <div className="flex gap-3">
              <Skeleton className="size-9 rounded-lg" />
              <Skeleton className="size-9 rounded-full" />
            </div>
          </div>

          <div className="flex-1 py-8">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-3 h-10 w-64 max-w-full" />
            <Skeleton className="mt-4 h-4 w-full max-w-2xl" />

            <div className="mt-8 grid gap-5 lg:grid-cols-3">
              <Skeleton className="h-40 rounded-2xl" />
              <Skeleton className="h-40 rounded-2xl" />
              <Skeleton className="h-40 rounded-2xl" />
            </div>

            <Skeleton className="mt-5 h-72 w-full rounded-2xl" />
          </div>
        </div>
      </main>
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