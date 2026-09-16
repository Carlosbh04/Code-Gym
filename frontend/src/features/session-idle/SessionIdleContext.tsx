import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import {
  useAuth,
} from '@/features/auth/AuthContext';

import {
  recordSessionActivity,
} from '@/features/auth/auth-api';

import {
  ApiError,
} from '@/lib/api/http-client';


import {
  SessionIdleModal,
} from './SessionIdleModal';

const IDLE_TIMEOUT_MS =
  15 * 60 * 1_000;

const WARNING_AFTER_MS =
  14 * 60 * 1_000;

const HEARTBEAT_THROTTLE_MS =
  60 * 1_000;

const WARNING_SECONDS =
  Math.ceil(
    (
      IDLE_TIMEOUT_MS
      - WARNING_AFTER_MS
    )
    / 1_000,
  );


type ActivitySyncResult =
  | 'synchronized'
  | 'retryable-failure'
  | 'session-ended';


interface SessionIdleContextValue {
  readonly warningOpen: boolean;

  readonly secondsRemaining: number;

  readonly continuePending: boolean;

  continueSession():
    Promise<void>;

  closeSession():
    Promise<void>;
}


const SessionIdleContext =
  createContext<
    SessionIdleContextValue | null
  >(null);


interface SessionIdleProviderProps {
  readonly children: ReactNode;
}


export function SessionIdleProvider({
  children,
}: SessionIdleProviderProps) {
  const {
    status,
    accessToken,
    refreshSession,
    logout,
  } = useAuth();

  const [
    warningOpen,
    setWarningOpen,
  ] = useState(false);

  const [
    secondsRemaining,
    setSecondsRemaining,
  ] = useState(
    WARNING_SECONDS,
  );

  const [
    continuePending,
    setContinuePending,
  ] = useState(false);

  const lastHumanActivityRef =
    useRef(
      Date.now(),
    );

  const lastHeartbeatRef =
    useRef(
      Date.now(),
    );

  const warningOpenRef =
    useRef(false);

  const statusRef =
    useRef(status);

  const accessTokenRef =
    useRef(accessToken);

  const heartbeatPromiseRef =
    useRef<
      Promise<ActivitySyncResult>
      | null
    >(null);

  const trailingHeartbeatTimerRef =
    useRef<number | null>(
      null,
    );

  const logoutPromiseRef =
    useRef<
      Promise<void>
      | null
    >(null);

  const sessionEndingRef =
    useRef(false);


  useEffect(
    () => {
      warningOpenRef.current =
        warningOpen;
    },
    [
      warningOpen,
    ],
  );


  useEffect(
    () => {
      statusRef.current =
        status;

      accessTokenRef.current =
        accessToken;
    },
    [
      accessToken,
      status,
    ],
  );


  const endSession =
    useCallback(
      (): Promise<void> => {
        if (
          logoutPromiseRef.current
          !== null
        ) {
          return logoutPromiseRef.current;
        }

        if (
          sessionEndingRef.current
        ) {
          return Promise.resolve();
        }

        sessionEndingRef.current =
          true;

        warningOpenRef.current =
          false;

        setWarningOpen(
          false,
        );

        const promise =
          (async () => {
            try {
              await logout();
            } catch {
              /*
               * AuthContext clears local
               * authentication in finally.
               */
            } finally {
              logoutPromiseRef.current =
                null;
            }
          })();

        logoutPromiseRef.current =
          promise;

        return promise;
      },
      [
        logout,
      ],
    );


  const sendActivity =
    useCallback(
      async (
        token: string,
      ): Promise<ActivitySyncResult> => {
        try {
          await recordSessionActivity(
            token,
          );

          return 'synchronized';
        } catch (error) {
          if (
            !(
              error instanceof ApiError
            )
            || error.status !== 401
          ) {
            return 'retryable-failure';
          }
        }

        /*
         * A 401 can simply mean that the
         * short-lived access token expired.
         *
         * Refresh once and retry activity.
         */
        let refreshedToken:
          string;

        try {
          refreshedToken =
            await refreshSession();
        } catch {
          return 'session-ended';
        }

        try {
          await recordSessionActivity(
            refreshedToken,
          );

          return 'synchronized';
        } catch (error) {
          if (
            error instanceof ApiError
            && error.status === 401
          ) {
            return 'session-ended';
          }

          return 'retryable-failure';
        }
      },
      [
        refreshSession,
      ],
    );


  const synchronizeActivity =
    useCallback(
      (
        force = false,
      ): Promise<ActivitySyncResult> => {
        const currentStatus =
          statusRef.current;

        const currentAccessToken =
          accessTokenRef.current;

        if (
          currentStatus !==
            'authenticated'
          || currentAccessToken === null
        ) {
          return Promise.resolve(
            'session-ended',
          );
        }

        if (
          heartbeatPromiseRef.current
          !== null
        ) {
          return heartbeatPromiseRef.current;
        }

        const now =
          Date.now();

        if (
          !force
          && (
            now
            - lastHeartbeatRef.current
          )
            < HEARTBEAT_THROTTLE_MS
        ) {
          return Promise.resolve(
            'synchronized',
          );
        }

        const promise =
          (async () => {
            const result =
              await sendActivity(
                currentAccessToken,
              );

            if (
              result ===
              'synchronized'
            ) {
              lastHeartbeatRef.current =
                Date.now();
            }

            return result;
          })();

        heartbeatPromiseRef.current =
          promise;

        void promise.finally(
          () => {
            if (
              heartbeatPromiseRef.current
              === promise
            ) {
              heartbeatPromiseRef.current =
                null;
            }
          },
        );

        return promise;
      },
      [
        sendActivity,
      ],
    );


  const scheduleTrailingHeartbeat =
    useCallback(
      () => {
        if (
          trailingHeartbeatTimerRef.current
          !== null
        ) {
          return;
        }

        const elapsed =
          Date.now()
          - lastHeartbeatRef.current;

        const delay =
          Math.max(
            0,
            HEARTBEAT_THROTTLE_MS
            - elapsed,
          );

        trailingHeartbeatTimerRef.current =
          window.setTimeout(
            () => {
              trailingHeartbeatTimerRef.current =
                null;

              if (
                warningOpenRef.current
                || statusRef.current !==
                  'authenticated'
              ) {
                return;
              }

              void synchronizeActivity(
                true,
              ).then(
                (result) => {
                  if (
                    result ===
                    'session-ended'
                  ) {
                    void endSession();
                  }
                },
              );
            },
            delay,
          );
      },
      [
        endSession,
        synchronizeActivity,
      ],
    );


  const resetLocalIdleClock =
    useCallback(
      () => {
        lastHumanActivityRef.current =
          Date.now();

        warningOpenRef.current =
          false;

        setWarningOpen(
          false,
        );

        setSecondsRemaining(
          WARNING_SECONDS,
        );
      },
      [],
    );


  const continueSession =
    useCallback(
      async () => {
        if (
          continuePending
          || status !==
            'authenticated'
          || accessToken === null
        ) {
          return;
        }

        setContinuePending(
          true,
        );

        try {
          const result =
            await synchronizeActivity(
              true,
            );

          if (
            result ===
            'session-ended'
          ) {
            await endSession();

            return;
          }

          if (
            result ===
            'retryable-failure'
          ) {
            /*
             * Keep the warning open.
             * A temporary network failure
             * must not fake a renewal.
             */
            return;
          }

          resetLocalIdleClock();
        } finally {
          setContinuePending(
            false,
          );
        }
      },
      [
        accessToken,
        continuePending,
        endSession,
        resetLocalIdleClock,
        status,
        synchronizeActivity,
      ],
    );


  const closeSession =
    useCallback(
      async () => {
        await endSession();
      },
      [
        endSession,
      ],
    );


  useEffect(
    () => {
      if (
        status !==
          'authenticated'
        || accessToken === null
      ) {
        warningOpenRef.current =
          false;

        heartbeatPromiseRef.current =
          null;

        if (
          trailingHeartbeatTimerRef.current
          !== null
        ) {
          window.clearTimeout(
            trailingHeartbeatTimerRef.current,
          );

          trailingHeartbeatTimerRef.current =
            null;
        }

        setWarningOpen(
          false,
        );

        setSecondsRemaining(
          WARNING_SECONDS,
        );

        return;
      }

      sessionEndingRef.current =
        false;

      const now =
        Date.now();

      lastHumanActivityRef.current =
        now;

      lastHeartbeatRef.current =
        now;

      warningOpenRef.current =
        false;

      setWarningOpen(
        false,
      );

      setSecondsRemaining(
        WARNING_SECONDS,
      );


      const handleHumanActivity =
        () => {
          /*
           * Once the warning is visible,
           * passive movement/scroll must
           * not renew the session.
           */
          if (
            warningOpenRef.current
          ) {
            return;
          }

          const now =
            Date.now();

          lastHumanActivityRef.current =
            now;

          const heartbeatAge =
            now
            - lastHeartbeatRef.current;

          if (
            heartbeatAge
            >= HEARTBEAT_THROTTLE_MS
          ) {
            void synchronizeActivity(
              true,
            ).then(
              (result) => {
                if (
                  result ===
                  'session-ended'
                ) {
                  void endSession();
                }
              },
            );

            return;
          }

          scheduleTrailingHeartbeat();
        };


      document.addEventListener(
        'pointerdown',
        handleHumanActivity,
        {
          passive: true,
        },
      );

      document.addEventListener(
        'keydown',
        handleHumanActivity,
      );

      document.addEventListener(
        'touchstart',
        handleHumanActivity,
        {
          passive: true,
        },
      );

      document.addEventListener(
        'scroll',
        handleHumanActivity,
        {
          passive: true,
          capture: true,
        },
      );


      const evaluateIdleState =
        () => {
          const elapsed =
            Date.now()
            - lastHumanActivityRef.current;

          if (
            elapsed
            >= IDLE_TIMEOUT_MS
          ) {
            void endSession();

            return;
          }

          if (
            elapsed
            < WARNING_AFTER_MS
          ) {
            return;
          }

          if (
            !warningOpenRef.current
          ) {
            warningOpenRef.current =
              true;

            setWarningOpen(
              true,
            );
          }

          const remaining =
            Math.max(
              0,
              Math.ceil(
                (
                  IDLE_TIMEOUT_MS
                  - elapsed
                )
                / 1_000,
              ),
            );

          setSecondsRemaining(
            remaining,
          );
        };


      const timer =
        window.setInterval(
          evaluateIdleState,
          1_000,
        );


      return () => {
        window.clearInterval(
          timer,
        );

        if (
          trailingHeartbeatTimerRef.current
          !== null
        ) {
          window.clearTimeout(
            trailingHeartbeatTimerRef.current,
          );

          trailingHeartbeatTimerRef.current =
            null;
        }

        document.removeEventListener(
          'pointerdown',
          handleHumanActivity,
        );

        document.removeEventListener(
          'keydown',
          handleHumanActivity,
        );

        document.removeEventListener(
          'touchstart',
          handleHumanActivity,
        );

        document.removeEventListener(
          'scroll',
          handleHumanActivity,
          true,
        );
      };
    },
    [
      endSession,
      scheduleTrailingHeartbeat,
      status,
      synchronizeActivity,
    ],
  );


  const value =
    useMemo<
      SessionIdleContextValue
    >(
      () => ({
        warningOpen,
        secondsRemaining,
        continuePending,
        continueSession,
        closeSession,
      }),
      [
        closeSession,
        continuePending,
        continueSession,
        secondsRemaining,
        warningOpen,
      ],
    );


  return (
    <SessionIdleContext.Provider
      value={value}
    >
      {children}

      <SessionIdleModal
        open={warningOpen}
        secondsRemaining={
          secondsRemaining
        }
        continuePending={
          continuePending
        }
        onContinue={
          continueSession
        }
        onCloseSession={
          closeSession
        }
      />
    </SessionIdleContext.Provider>
  );
}


export function useSessionIdle():
SessionIdleContextValue {
  const context =
    useContext(
      SessionIdleContext,
    );

  if (context === null) {
    throw new Error(
      'useSessionIdle must be used within SessionIdleProvider',
    );
  }

  return context;
}
