import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  getCurrentUser,
  googleLogin as googleLoginRequest,
  login as loginRequest,
  logout as logoutRequest,
  refreshAccessToken,
  register as registerRequest,
  updateProfile as updateProfileRequest,
  type AuthUser,
  type GoogleLoginInput,
  type LoginInput,
  type RegisterInput,
  type UpdateProfileInput,
} from './auth-api';

export type AuthStatus =
  | 'loading'
  | 'authenticated'
  | 'unauthenticated';

export interface AuthContextValue {
  readonly user: AuthUser | null;
  readonly accessToken: string | null;
  readonly status: AuthStatus;
  readonly isAuthenticated: boolean;

  login(
    input: LoginInput,
  ): Promise<void>;

  googleLogin(

    input: GoogleLoginInput,

  ): Promise<void>;

  register(
    input: RegisterInput,
  ): Promise<void>;

  updateProfile(
    input: UpdateProfileInput,
  ): Promise<void>;

  refreshSession(): Promise<string>;

  logout(): Promise<void>;
}

interface BootstrapResult {
  readonly accessToken: string;
  readonly user: AuthUser;
}

const AuthContext =
  createContext<AuthContextValue | null>(
    null,
  );

let bootstrapPromise:
  Promise<BootstrapResult> | null =
    null;

let accessTokenRefreshPromise:
  ReturnType<typeof refreshAccessToken> | null =
    null;

async function refreshAccessTokenOnce():
ReturnType<typeof refreshAccessToken> {
  if (accessTokenRefreshPromise !== null) {
    return accessTokenRefreshPromise;
  }

  accessTokenRefreshPromise =
    refreshAccessToken();

  try {
    return await accessTokenRefreshPromise;
  } finally {
    accessTokenRefreshPromise = null;
  }
}

async function bootstrapAuthentication():
Promise<BootstrapResult> {
  if (
    bootstrapPromise !== null
  ) {
    return bootstrapPromise;
  }

  bootstrapPromise =
    (async () => {
      const refreshed =
        await refreshAccessTokenOnce();

      const me =
        await getCurrentUser(
          refreshed.accessToken,
        );

      return {
        accessToken:
          refreshed.accessToken,

        user:
          me.user,
      };
    })();

  try {
    return await bootstrapPromise;
  } finally {
    bootstrapPromise =
      null;
  }
}

interface AuthProviderProps {
  readonly children: ReactNode;
}

export function AuthProvider({
  children,
}: AuthProviderProps) {
  const [
    user,
    setUser,
  ] =
    useState<AuthUser | null>(
      null,
    );

  const [
    accessToken,
    setAccessToken,
  ] =
    useState<string | null>(
      null,
    );

  const [
    status,
    setStatus,
  ] =
    useState<AuthStatus>(
      'loading',
    );

  const clearAuthentication =
    useCallback(
      () => {
        setUser(
          null,
        );

        setAccessToken(
          null,
        );

        setStatus(
          'unauthenticated',
        );
      },
      [],
    );

  const refreshSession =
    useCallback(
      async (): Promise<string> => {
        try {
          const refreshed =
            await refreshAccessTokenOnce();

          setAccessToken(
            refreshed.accessToken,
          );

          setStatus(
            'authenticated',
          );

          return refreshed.accessToken;
        } catch (error: unknown) {
          clearAuthentication();
          throw error;
        }
      },
      [
        clearAuthentication,
      ],
    );

  const establishAuthentication =
    useCallback(
      async (
        token: string,
      ) => {
        const me =
          await getCurrentUser(
            token,
          );

        setAccessToken(
          token,
        );

        setUser(
          me.user,
        );

        setStatus(
          'authenticated',
        );
      },
      [],
    );

  useEffect(
    () => {
      let active =
        true;

      const bootstrap =
        async () => {
          try {
            const result =
              await bootstrapAuthentication();

            if (
              !active
            ) {
              return;
            }

            setAccessToken(
              result.accessToken,
            );

            setUser(
              result.user,
            );

            setStatus(
              'authenticated',
            );
          } catch {
            if (
              !active
            ) {
              return;
            }

            clearAuthentication();
          }
        };

      void bootstrap();

      return () => {
        active =
          false;
      };
    },
    [
      clearAuthentication,
    ],
  );

  const login =
    useCallback(
      async (
        input: LoginInput,
      ) => {
        const result =
          await loginRequest(
            input,
          );

        setAccessToken(
          result.accessToken,
        );

        setUser(
          result.user,
        );

        setStatus(
          'authenticated',
        );
      },
      [],
    );

  const googleLogin =

    useCallback(

      async (

        input: GoogleLoginInput,

      ) => {

        const result =

          await googleLoginRequest(

            input,

          );

        setAccessToken(

          result.accessToken,

        );

        setUser(

          result.user,

        );

        setStatus(

          'authenticated',

        );

      },

      [],

    );


  const register =
    useCallback(
      async (
        input: RegisterInput,
      ) => {
        await registerRequest(
          input,
        );

        const result =
          await loginRequest({
            email:
              input.email,

            password:
              input.password,
          });

        await establishAuthentication(
          result.accessToken,
        );
      },
      [
        establishAuthentication,
      ],
    );

  const logout =
    useCallback(
      async () => {
        try {
          await logoutRequest();
        } finally {
          clearAuthentication();
        }
      },
      [
        clearAuthentication,
      ],
    );

  const updateProfile =
    useCallback(
      async (
        input: UpdateProfileInput,
      ) => {
        if (accessToken === null) {
          throw new Error(
            'Cannot update profile without an access token',
          );
        }

        const result =
          await updateProfileRequest(
            input,
            accessToken,
          );

        setUser(
          result.user,
        );
      },
      [
        accessToken,
      ],
    );

  const value =
    useMemo<AuthContextValue>(
      () => ({
        user,
        accessToken,
        status,

        isAuthenticated:
          status
          === 'authenticated',

        login,
        googleLogin,

        register,
        updateProfile,
        refreshSession,
        logout,
      }),
      [
        user,
        accessToken,
        status,
        login,
        googleLogin,

        register,
        updateProfile,
        refreshSession,
        logout,
      ],
    );

  return (
    <AuthContext.Provider
      value={value}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth():
AuthContextValue {
  const context =
    useContext(
      AuthContext,
    );

  if (
    context === null
  ) {
    throw new Error(
      'useAuth must be used inside AuthProvider',
    );
  }

  return context;
}
