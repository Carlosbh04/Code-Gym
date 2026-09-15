import { useContext, useEffect, useMemo, useState, type ContextType } from 'react';

import { SessionRecoveryContext } from '@/contexts/session-recovery-context';
import { useHistory } from '@/hooks/useHistory';
import type { ExerciseSession } from '@/types/exercise';
import {
  CHECKING_COMPLETION,
  resolveSessionState,
  type CompletionLookup,
  type RecoveryState,
  type ResolvedSessionState,
} from './session-status';

export function useSessionStates(
  sessions: ExerciseSession[],
): ReadonlyMap<string, ResolvedSessionState> {
  const recoveryStore = useContext(SessionRecoveryContext);
  const recovery = useSessionRecoveryState(recoveryStore);
  const { getCompletedSession } = useHistory();
  const [completions, setCompletions] = useState<ReadonlyMap<string, CompletionLookup>>(
    new Map(),
  );

  useEffect(() => {
    let active = true;

    void Promise.all(
      sessions.map(async (session): Promise<readonly [string, CompletionLookup]> => {
        try {
          const completedSession = await getCompletedSession(session.id);
          return [session.id, { status: 'ready', completedSession }];
        } catch (error: unknown) {
          return [session.id, {
            status: 'error',
            message:
              error instanceof Error
                ? error.message
                : 'No se pudo leer el historial de esta sesión.',
          }];
        }
      }),
    ).then((entries) => {
      if (active) setCompletions(new Map(entries));
    });

    return () => {
      active = false;
    };
  }, [getCompletedSession, sessions]);

  return useMemo(
    () => new Map(
      sessions.map((session) => [
        session.id,
        resolveSessionState(
          session,
          completions.get(session.id) ?? CHECKING_COMPLETION,
          recovery,
        ),
      ]),
    ),
    [completions, recovery, sessions],
  );
}

export function useSessionRecoveryState(
  recoveryStore: ContextType<typeof SessionRecoveryContext>,
): RecoveryState {
  const [recovery] = useState<RecoveryState>(() => {
    if (recoveryStore === null) {
      return { status: 'ready', sessionId: null, currentStep: null };
    }
    try {
      const snapshot = recoveryStore.load();
      return {
        status: 'ready',
        sessionId: snapshot?.sessionId ?? null,
        currentStep: snapshot?.currentStep ?? null,
      };
    } catch (error: unknown) {
      return {
        status: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'No se pudo leer la práctica en curso.',
      };
    }
  });

  return recovery;
}
