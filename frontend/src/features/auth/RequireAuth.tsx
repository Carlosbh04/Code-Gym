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
        aria-busy="true"
        className="min-h-screen bg-background"
      >
        <span className="sr-only">
          Comprobando sesión…
        </span>
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