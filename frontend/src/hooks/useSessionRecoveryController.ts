import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
} from 'react';
import { createInitialSessionState } from '@/features/session/session-reducer';
import type {
  SessionAction,
  SessionState,
} from '@/features/session/session-types';
import { useContent } from '@/hooks/useContent';
import { useSessionRecoveryStore } from '@/hooks/useSessionRecovery';
import {
  SessionRecoveryError,
  type SessionRecoverySnapshot,
} from '@/lib/recovery/ISessionRecoveryStore';
import type { ExerciseSession } from '@/types/exercise';

export type RecoveryStatus =
  | 'checking'
  | 'none'
  | 'available'
  | 'invalid-json'
  | 'recovery-failed';

export interface SessionStorageWarning {
  code: 'STORAGE_UNAVAILABLE' | 'STORAGE_FULL';
  message: string;
  canRetry: boolean;
}

interface LoadPlan {
  sessionId: string;
  recovery: SessionRecoverySnapshot | null;
}

interface ReadyMarker {
  sessionId: string;
  startTime: number;
  currentStep: number;
  answers: SessionRecoverySnapshot['answers'];
}

type RecoveryStateFields = Pick<
  SessionState,
  | 'sessionId'
  | 'currentStep'
  | 'answers'
  | 'elapsedMs'
  | 'revealedHints'
  | 'startTime'
>;

export interface SessionRecoveryController {
  session: ExerciseSession | null;
  recoveryStatus: RecoveryStatus;
  recoverySessionId: string | null;
  recoverySnapshot: SessionRecoverySnapshot | null;
  storageWarning: SessionStorageWarning | null;
  continueRecovery: () => void;
  startNewSession: () => void;
  retryRecoveryPersistence: () => void;
  abandonSession: () => void;
}

interface SessionRecoveryControllerOptions {
  requestedSessionId: string;
  state: SessionState;
  trainingRunId: string | null;
  dispatch: Dispatch<SessionAction>;
  onSessionReady: (
    resumedAt: number,
    trainingRunId: string | null,
  ) => void;
}

/**
 * Orquesta exclusivamente el ciclo temporal de §21.
 *
 * `useSession` conserva ejercicio, validación y completion; este controlador
 * concentra inspección previa, carga/restauración, reloj y persistencia (D019).
 */
export function useSessionRecoveryController({
  requestedSessionId,
  state,
  trainingRunId,
  dispatch,
  onSessionReady,
}: SessionRecoveryControllerOptions): SessionRecoveryController {
  const content = useContent();
  const store = useSessionRecoveryStore();
  const [session, setSession] = useState<ExerciseSession | null>(null);
  const [status, setStatus] = useState<RecoveryStatus>('checking');
  const [pending, setPending] = useState<SessionRecoverySnapshot | null>(null);
  const [loadPlan, setLoadPlan] = useState<LoadPlan | null>(null);
  const [readyMarker, setReadyMarker] = useState<ReadyMarker | null>(null);
  const [warning, setWarning] = useState<SessionStorageWarning | null>(null);

  const handledRoute = useRef<string | null>(null);
  const persistencePaused = useRef(false);
  const abandoned = useRef(false);
  const completionCleanupAttempted = useRef(false);
  const pendingOperation = useRef<'save' | 'clear' | null>(null);
  const activeClock = useRef({ accumulatedMs: 0, resumedAt: 0 });

  const toRecoveryError = useCallback((reason: unknown) => {
    if (reason instanceof SessionRecoveryError) return reason;
    return new SessionRecoveryError(
      'STORAGE_UNAVAILABLE',
      reason instanceof Error ? reason.message : String(reason),
      reason,
    );
  }, []);

  const reportStorageFailure = useCallback(
    (reason: unknown, operation: 'save' | 'clear') => {
      const error = toRecoveryError(reason);
      const code: SessionStorageWarning['code'] =
        error.code === 'STORAGE_FULL' ? 'STORAGE_FULL' : 'STORAGE_UNAVAILABLE';

      persistencePaused.current = true;
      pendingOperation.current = operation;
      setWarning({
        code,
        canRetry: code === 'STORAGE_FULL',
        message:
          code === 'STORAGE_FULL'
            ? 'No hay espacio para guardar la sesión. Tu estado sigue en memoria.'
            : 'No se pudo acceder al almacenamiento temporal. La sesión continuará en memoria.',
      });
    },
    [toRecoveryError],
  );

  const snapshotOf = useCallback((current: RecoveryStateFields) => {
    const clock = activeClock.current;
    const now = Date.now();
    return {
      sessionId: current.sessionId,
      ...(trainingRunId === null
        ? {}
        : { trainingRunId }),
      currentStep: current.currentStep,
      answers: current.answers,
      elapsedMs:
        clock.accumulatedMs + Math.max(0, now - clock.resumedAt),
      revealedHints: current.revealedHints,
      startTime: current.startTime,
      lastActivityAt: now,
    } satisfies SessionRecoverySnapshot;
  }, [trainingRunId]);

  useEffect(() => {
    if (handledRoute.current === requestedSessionId) return;
    let active = true;

    void Promise.resolve().then(() => {
      if (!active || handledRoute.current === requestedSessionId) return;
      handledRoute.current = requestedSessionId;
      setSession(null);
      setLoadPlan(null);
      setReadyMarker(null);
      setPending(null);
      setStatus('checking');

      try {
        const stored = store.load();
        if (stored !== null) {
          if (stored.sessionId === requestedSessionId) {
            setLoadPlan({
              sessionId: stored.sessionId,
              recovery: stored,
            });
            return;
          }

          setPending(stored);
          setStatus('available');
          return;
        }

        persistencePaused.current = false;
        abandoned.current = false;
        setLoadPlan({ sessionId: requestedSessionId, recovery: null });
      } catch (reason: unknown) {
        const error = toRecoveryError(reason);
        if (error.code === 'INVALID_JSON') {
          setStatus('invalid-json');
          return;
        }
        if (error.code === 'RECOVERY_FAILED') {
          setStatus('recovery-failed');
          return;
        }

        // Si no puede inspeccionarse, se continúa en memoria sin intentar una
        // escritura que pudiera sobrescribir datos inaccesibles.
        reportStorageFailure(error, 'save');
        setLoadPlan({ sessionId: requestedSessionId, recovery: null });
      }
    });

    return () => {
      active = false;
    };
  }, [requestedSessionId, reportStorageFailure, store, toRecoveryError]);

  useEffect(() => {
    if (loadPlan === null) return;
    let active = true;

    content
      .getSession(loadPlan.sessionId)
      .then((loaded) => {
        if (!active) return;

        if (loaded === null) {
          if (loadPlan.recovery !== null) {
            setPending(loadPlan.recovery);
            setStatus('recovery-failed');
            setLoadPlan(null);
          } else {
            dispatch({
              type: 'SET_ERROR',
              payload: `Sesión no encontrada: ${loadPlan.sessionId}`,
            });
            setStatus('none');
          }
          return;
        }

        const restored = loadPlan.recovery;
        if (restored !== null && !canRestore(restored, loaded)) {
          setPending(restored);
          setStatus('recovery-failed');
          setLoadPlan(null);
          return;
        }

        const now = Date.now();
        const nextState = restored === null
          ? createInitialSessionState(loaded.id, now)
          : {
              ...restored,
              isValidating: false,
              isComplete: false,
              error: null,
            };

        setSession(loaded);
        activeClock.current = {
          accumulatedMs: restored?.elapsedMs ?? 0,
          resumedAt: now,
        };
        setReadyMarker({
          sessionId: nextState.sessionId,
          startTime: nextState.startTime,
          currentStep: nextState.currentStep,
          answers: nextState.answers,
        });
        dispatch({ type: 'RESTORE', payload: nextState });
        completionCleanupAttempted.current = false;
        onSessionReady(
          now,
          restored?.trainingRunId ?? null,
        );
        setLoadPlan(null);
      })
      .catch((error: unknown) => {
        if (!active) return;
        dispatch({
          type: 'SET_ERROR',
          payload: error instanceof Error ? error.message : String(error),
        });
      });

    return () => {
      active = false;
    };
  }, [content, dispatch, loadPlan, onSessionReady]);

  useEffect(() => {
    if (
      readyMarker === null ||
      state.sessionId !== readyMarker.sessionId ||
      state.startTime !== readyMarker.startTime ||
      state.currentStep !== readyMarker.currentStep ||
      state.answers !== readyMarker.answers
    ) {
      return;
    }

    let active = true;
    void Promise.resolve().then(() => {
      if (!active) return;
      setReadyMarker(null);
      setStatus('none');
    });
    return () => {
      active = false;
    };
  }, [readyMarker, state.answers, state.currentStep, state.sessionId, state.startTime]);

  useEffect(() => {
    if (
      status !== 'none' ||
      session === null ||
      state.isComplete ||
      persistencePaused.current ||
      abandoned.current
    ) {
      return;
    }

    const snapshot = snapshotOf({
      sessionId: state.sessionId,
      currentStep: state.currentStep,
      answers: state.answers,
      elapsedMs: state.elapsedMs,
      revealedHints: state.revealedHints,
      startTime: state.startTime,
    });
    let active = true;
    void Promise.resolve().then(() => {
      try {
        store.save(snapshot);
        pendingOperation.current = null;
      } catch (reason: unknown) {
        if (active) reportStorageFailure(reason, 'save');
      }
    });
    return () => {
      active = false;
    };
  }, [
    reportStorageFailure,
    session,
    snapshotOf,
    state.answers,
    state.currentStep,
    state.elapsedMs,
    state.revealedHints,
    state.isComplete,
    state.sessionId,
    state.startTime,
    status,
    store,
    trainingRunId,
  ]);

  useEffect(() => {
    if (!state.isComplete || completionCleanupAttempted.current) return;

    completionCleanupAttempted.current = true;
    pendingOperation.current = 'clear';

    void Promise.resolve().then(() => {
      try {
        store.clear();
        pendingOperation.current = null;
        persistencePaused.current = false;
        setWarning(null);
      } catch (reason: unknown) {
        reportStorageFailure(reason, 'clear');
      }
    });
  }, [reportStorageFailure, state.isComplete, store]);

  const continueRecovery = useCallback(() => {
    if (pending === null || status !== 'available') return;

    handledRoute.current = pending.sessionId;
    persistencePaused.current = false;
    abandoned.current = false;
    setPending(null);
    setLoadPlan({ sessionId: pending.sessionId, recovery: pending });
    setStatus('checking');
  }, [pending, status]);

  const startNewSession = useCallback(() => {
    if (status !== 'available' && status !== 'recovery-failed') return;

    persistencePaused.current = false;
    abandoned.current = false;
    pendingOperation.current = null;
    setPending(null);
    setWarning(null);

    try {
      store.clear();
    } catch (reason: unknown) {
      // La decisión explícita permite reemplazar al hacer retry, aunque el
      // borrado previo no estuviera disponible.
      reportStorageFailure(reason, 'save');
    }

    handledRoute.current = requestedSessionId;
    setLoadPlan({ sessionId: requestedSessionId, recovery: null });
    setStatus('checking');
  }, [reportStorageFailure, requestedSessionId, status, store]);

  const retryRecoveryPersistence = useCallback(() => {
    if (
      warning?.canRetry !== true ||
      session === null ||
      (state.isComplete && pendingOperation.current !== 'clear')
    ) {
      return;
    }

    try {
      if (pendingOperation.current === 'clear') {
        store.clear();
      } else {
        store.save(snapshotOf(state));
      }
      pendingOperation.current = null;
      persistencePaused.current = false;
      setWarning(null);
    } catch (reason: unknown) {
      reportStorageFailure(
        reason,
        pendingOperation.current === 'clear' ? 'clear' : 'save',
      );
    }
  }, [reportStorageFailure, session, snapshotOf, state, store, warning?.canRetry]);

  const abandonSession = useCallback(() => {
    abandoned.current = true;
    persistencePaused.current = true;
    pendingOperation.current = 'clear';
    try {
      store.clear();
      pendingOperation.current = null;
      setWarning(null);
    } catch (reason: unknown) {
      reportStorageFailure(reason, 'clear');
    }
  }, [reportStorageFailure, store]);

  return {
    session,
    recoveryStatus: status,
    recoverySessionId: pending?.sessionId ?? null,
    recoverySnapshot: pending,
    storageWarning: warning,
    continueRecovery,
    startNewSession,
    retryRecoveryPersistence,
    abandonSession,
  };
}

/** Valida invariantes que solo pueden comprobarse contra el contenido actual. */
function canRestore(
  snapshot: SessionRecoverySnapshot,
  session: ExerciseSession,
): boolean {
  if (
    snapshot.sessionId !== session.id ||
    session.steps.length === 0 ||
    snapshot.currentStep >= session.steps.length ||
    snapshot.answers.length > session.steps.length
  ) {
    return false;
  }

  for (let index = 0; index < snapshot.answers.length; index += 1) {
    const answer = snapshot.answers[index];
    const step = session.steps[index];
    if (
      answer === undefined ||
      step === undefined ||
      answer.stepId !== step.id ||
      answer.stepType !== step.type
    ) {
      return false;
    }
  }

  const current = session.steps[snapshot.currentStep];
  return (
    current !== undefined &&
    snapshot.revealedHints.every(
      (hint, index) =>
        hint.index === index
        && hint.index < current.hintCount,
    )
  );
}
