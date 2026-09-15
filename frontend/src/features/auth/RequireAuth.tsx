import {
  Navigate,
  Outlet,
  useLocation,
} from 'react-router-dom';

import {
  useAuth,
} from './AuthContext';

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
        className="flex min-h-screen items-center justify-center text-sm text-code-muted"
      >
        Comprobando sesión…
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