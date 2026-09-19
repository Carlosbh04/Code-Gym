import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';
import { useTraining } from '@/hooks/useTraining';
import {
  useSessionRecoveryController,
  type RecoveryStatus,
  type SessionStorageWarning,
} from '@/hooks/useSessionRecoveryController';
import {
  createInitialSessionState,
  sessionReducer,
} from '@/features/session/session-reducer';
import type {
  FindErrorSelection,
  SessionState,
} from '@/features/session/session-types';
import type { ExerciseSession, ExerciseStep, StepAnswer } from '@/types/exercise';
import type { SessionRecoverySnapshot } from '@/lib/recovery/ISessionRecoveryStore';

/**
 * Orquesta una sesión de ejercicios (§15, §18).
 *
 * La UI coordina estado temporal y delega la corrección
 * persistente al backend mediante TrainingRun.
 *
 * Todos los tipos de ejercicio, incluido `fix-code`, se envían
 * al backend. El navegador representa exclusivamente el
 * veredicto autorizado recibido en `result.attempt.isCorrect`.
 *
 * Para `fix-code`, los tests privados se ejecutan en backend y
 * el cliente recibe únicamente feedback público de ejecución.
 */

const NO_ERROR_SELECTION: FindErrorSelection = { line: null, errorType: null };

export interface UseSessionResult {
  session: ExerciseSession | null;
  currentStep: ExerciseStep | null;
  state: SessionState;
  isLoading: boolean;
  /** Opción elegida en el paso actual, todavía sin enviar. */
  selectedOptionId: string | null;
  /** Línea y tipo elegidos en un paso find-error, todavía sin enviar (D014). */
  selectedError: FindErrorSelection;
  /** Código escrito en un paso fix-code, o null si no se ha editado. */
  fixCodeDraft: string | null;
  /** true cuando el paso actual tiene una respuesta completa lista para enviar. */
  canSubmit: boolean;
  /** true cuando el paso actual ya tiene respuesta guardada. */
  isAnswered: boolean;
  isLastStep: boolean;
  /**
   * Fallo de infraestructura del último intento, o null. §27 los clasifica como
   * recuperables y reintentables: no son una respuesta incorrecta, y por eso no
   * llegan al reducer ni cuentan como intento.
   */
  executionError: string | null;
  executionStatus: 'idle' | 'running' | 'passed' | 'failed' | 'error';
  /** true mientras se persiste la finalización completa (D018). */
  isCompleting: boolean;
  /** Fallo de persistencia de la finalización, separado del error de carga. */
  completionError: string | null;
  /** Fallo recuperable al solicitar una pista al backend. */
  hintError: string | null;
  /** true mientras el backend autoriza y devuelve la siguiente pista. */
  isRevealingHint: boolean;
  /** Estado del diálogo/estado de recuperación previo a iniciar la sesión. */
  recoveryStatus: RecoveryStatus;
  /** Identidad de la sesión recuperable, incluso si no coincide con la URL. */
  recoverySessionId: string | null;
  /** Snapshot pendiente que alimenta el resumen visual sin restaurarlo todavía. */
  recoverySnapshot: SessionRecoverySnapshot | null;
  /** Aviso no bloqueante cuando la persistencia temporal no está disponible. */
  storageWarning: SessionStorageWarning | null;
  select: (optionId: string) => void;
  /** Guarda el código del paso fix-code en curso. No lo valida. */
  editCode: (code: string) => void;
  /** Pide al backend la siguiente pista canónica del paso actual. */
  revealHint: () => void;
  selectError: (next: FindErrorSelection) => void;
  submit: () => void;
  next: () => void;
  retryCompletion: () => void;
  continueRecovery: () => void;
  startNewSession: () => void;
  retryRecoveryPersistence: () => void;
  /** Capacidad explícita; T052 no inventa todavía una navegación para usarla. */
  abandonSession: () => void;
}

export function useSession(sessionId: string): UseSessionResult {
  const training = useTraining();

  const [
    trainingRunId,
    setTrainingRunId,
  ] = useState<string | null>(null);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [selectedError, setSelectedError] =
    useState<FindErrorSelection>(NO_ERROR_SELECTION);
  const [fixCodeDraft, setFixCodeDraft] = useState<string | null>(null);
  const [executionError, setExecutionError] = useState<string | null>(null);
  const [executionStatus, setExecutionStatus] = useState<
    'idle' | 'running' | 'passed' | 'failed' | 'error'
  >('idle');
  const [completionError, setCompletionError] = useState<string | null>(null);
  const [hintError, setHintError] = useState<string | null>(null);
  const [isRevealingHint, setIsRevealingHint] = useState(false);
  const [state, dispatch] = useReducer(
    sessionReducer,
    createInitialSessionState(sessionId, 0),
  );

  // El reloj no puede leerse durante el render: se fija al montar y al cambiar
  // de paso, que son momentos donde la impureza sí es legítima.
  const stepStartedAt = useRef(0);
  // El estado React se actualiza en el siguiente render. Esta guarda síncrona
  // cierra el hueco entre el primer clic y ese render, donde dos submit seguidos
  // podrían llamar al executor antes de que `isValidating` se hiciera visible.
  const validationInFlight = useRef(false);
  const hintRevealInFlight = useRef(false);
  /**
   * La última respuesta del TrainingRun debe traer `completion`.
   * Esta referencia solo confirma que el backend ya hizo atómicamente:
   * Attempt + TrainingRun completed + CompletedSession + ConceptProgress.
   */
  const serverCompletionConfirmed = useRef(false);

  /**
   * Una creación de run puede sobrevivir a renders intermedios
   * donde trainingRunId todavía no se ha publicado.
   *
   * Esto evita dos POST /training/runs por doble ejecución
   * del efecto o por renders consecutivos.
   */
  const trainingRunStart = useRef<{
    sessionId: string;
    promise: Promise<string>;
  } | null>(null);

  const onSessionReady = useCallback((
    resumedAt: number,
    restoredTrainingRunId: string | null,
  ) => {
    stepStartedAt.current = resumedAt;
    setTrainingRunId(restoredTrainingRunId);
    serverCompletionConfirmed.current = false;
    setSelectedOptionId(null);
    setSelectedError(NO_ERROR_SELECTION);
    setFixCodeDraft(null);
    setExecutionError(null);
    setExecutionStatus('idle');
    setCompletionError(null);
    setHintError(null);
    setIsRevealingHint(false);
    hintRevealInFlight.current = false;
  }, []);

  const recovery = useSessionRecoveryController({
    requestedSessionId: sessionId,
    state,
    trainingRunId,
    dispatch,
    onSessionReady,
  });
  const { session } = recovery;

  /**
   * Devuelve la identidad backend de este TrainingRun.
   *
   * Es idempotente dentro del ciclo de vida del hook: si el efecto de
   * inicialización y submit() llegan al mismo tiempo, ambos comparten
   * exactamente la misma Promise y solo existe un POST /training/runs.
   */
  const ensureTrainingRun = useCallback((): Promise<string> => {
    if (trainingRunId !== null) {
      return Promise.resolve(
        trainingRunId,
      );
    }

    if (session === null) {
      return Promise.reject(
        new Error(
          'Training session is not ready',
        ),
      );
    }

    const existing =
      trainingRunStart.current;

    if (
      existing !== null &&
      existing.sessionId === session.id
    ) {
      return existing.promise;
    }

    const promise = training
      .startRun(session.id)
      .then((run) => run.id);

    trainingRunStart.current = {
      sessionId: session.id,
      promise,
    };

    void promise
      .then((runId) => {
        setTrainingRunId(runId);
      })
      .catch(() => {
        if (
          trainingRunStart.current
            ?.promise === promise
        ) {
          trainingRunStart.current =
            null;
        }
      });

    return promise;
  }, [
    session,
    training,
    trainingRunId,
  ]);

  useEffect(() => {
    if (
      session === null ||
      recovery.recoveryStatus !== 'none' ||
      trainingRunId !== null
    ) {
      return;
    }

    void ensureTrainingRun()
      .catch((reason: unknown) => {
        dispatch({
          type: 'SET_ERROR',
          payload:
            reason instanceof Error
              ? reason.message
              : String(reason),
        });
      });
  }, [
    ensureTrainingRun,
    recovery.recoveryStatus,
    session,
    trainingRunId,
  ]);

  const currentStep = session?.steps[state.currentStep] ?? null;
  const isAnswered = state.answers.length > state.currentStep;
  const isLastStep =
    session !== null && state.currentStep === session.steps.length - 1;

  const select = useCallback((optionId: string) => {
    setSelectedOptionId(optionId);
  }, []);

  const selectError = useCallback((next: FindErrorSelection) => {
    setSelectedError(next);
  }, []);

  const editCode = useCallback((code: string) => {
    setFixCodeDraft(code);
  }, []);

  /**
   * Solicita la siguiente pista al backend. El cliente nunca conoce el texto
   * futuro ni decide su índice y solo actualiza la UI tras recibir confirmación.
   */
  const revealHint = useCallback(() => {
    if (
      currentStep === null
      || isAnswered
      || state.isValidating
      || hintRevealInFlight.current
      || state.revealedHints.length
        >= currentStep.hintCount
    ) {
      return;
    }

    const expectedIndex =
      state.revealedHints.length;

    hintRevealInFlight.current = true;
    setIsRevealingHint(true);
    setHintError(null);

    void ensureTrainingRun()
      .then((runId) =>
        training.revealHint(
          runId,
          currentStep.id,
        ),
      )
      .then((hint) => {
        if (
          hint.index !== expectedIndex
          || hint.totalHints
            !== currentStep.hintCount
          || hint.text.trim() === ''
        ) {
          throw new Error(
            'El backend devolvió una pista incompatible con la sesión',
          );
        }

        dispatch({
          type: 'REVEAL_HINT',
          payload: {
            index: hint.index,
            text: hint.text,
          },
        });
      })
      .catch((error: unknown) => {
        setHintError(
          error instanceof Error
            ? error.message
            : String(error),
        );
      })
      .finally(() => {
        hintRevealInFlight.current = false;
        setIsRevealingHint(false);
      });
  }, [
    currentStep,
    ensureTrainingRun,
    isAnswered,
    state.revealedHints.length,
    state.isValidating,
    training,
  ]);

  /**
   * La respuesta lista para enviar, o null si el paso todavía está a medias.
   * find-error necesita sus dos mitades (D014); los demás, la opción elegida.
   */
  const pendingAnswer = useMemo<StepAnswer | null>(() => {
    if (currentStep === null) return null;

    if (currentStep.type === 'find-error') {
      const { line, errorType } = selectedError;
      return line !== null && errorType !== null ? { line, errorType } : null;
    }

    // fix-code responde con el código escrito, que `StepAnswer` ya admite como
    // cadena desde D014. Sin editar no hay respuesta: lo que se ve en el editor
    // es el código roto del enunciado, no una solución del usuario.
    if (currentStep.type === 'fix-code') {
      return fixCodeDraft !== null && fixCodeDraft.trim() !== '' ? fixCodeDraft : null;
    }

    return selectedOptionId;
  }, [currentStep, fixCodeDraft, selectedError, selectedOptionId]);

  const submit = useCallback(() => {
    if (
      currentStep === null ||
      pendingAnswer === null ||
      state.isValidating ||
      hintRevealInFlight.current ||
      validationInFlight.current
    ) {
      return;
    }

    const runPromise =
      ensureTrainingRun();

    const durationMs =
      Math.max(
        0,
        Date.now() - stepStartedAt.current,
      );

    const registerServerAnswer = (
      isCorrect: boolean,
      hintsUsed: number,
    ) => {
      dispatch({
        type: 'SUBMIT_ANSWER',
        payload: {
          stepId: currentStep.id,
          stepType: currentStep.type,
          answer: pendingAnswer,
          isCorrect,
          timeSpentMs: durationMs,
          hintsUsed,
        },
      });
    };

    const submitToServer = async () => {
      const runId = await runPromise;

      const result =
        await training.submitAnswer(
          runId,
          {
            exerciseId:
              currentStep.id,
            answer:
              pendingAnswer,
            durationMs,
          },
        );

      if (result.completion !== null) {
        serverCompletionConfirmed.current = true;
      }

      registerServerAnswer(
        result.attempt.isCorrect,
        result.attempt.hintsUsed,
      );

      return result;
    };

    validationInFlight.current = true;
    setExecutionError(null);
    dispatch({
      type: 'SET_VALIDATING',
      payload: true,
    });

    if (currentStep.type !== 'fix-code') {
      void submitToServer()
        .catch((error: unknown) => {
          setExecutionError(
            error instanceof Error
              ? error.message
              : String(error),
          );
        })
        .finally(() => {
          dispatch({
            type: 'SET_VALIDATING',
            payload: false,
          });

          validationInFlight.current =
            false;
        });

      return;
    }

    // `Comprobar` es autoritativo del backend. El frontend envía el código
    // del usuario y únicamente representa el veredicto devuelto por el servidor.
    // Un resultado previo de «Ejecutar tests» no se reutiliza como verdad.
    setExecutionStatus('running');

    void submitToServer()
      .then((result) => {
        if (result.execution === null) {
          throw new Error(
            'El backend no devolvió feedback de ejecución para fix-code',
          );
        }

        /*
         * execution.passed describe únicamente si el código
         * superó los tests funcionales.
         *
         * El veredicto autorizado y persistido del ejercicio
         * vive en Attempt.isCorrect, que también incorpora
         * los requisitos pedagógicos del backend.
         */
        setExecutionStatus(
          result.attempt.isCorrect
            ? 'passed'
            : 'failed',
        );
      })
      .catch((error: unknown) => {
        setExecutionError(
          error instanceof Error
            ? error.message
            : String(error),
        );

        setExecutionStatus('error');
      })
      .finally(() => {
        dispatch({
          type: 'SET_VALIDATING',
          payload: false,
        });

        validationInFlight.current =
          false;
      });
  }, [
    currentStep,
    ensureTrainingRun,
    pendingAnswer,
    state.isValidating,
    training,
  ]);

  const startCompletion = useCallback(() => {
    if (
      session === null ||
      !isLastStep ||
      !isAnswered ||
      state.answers.length !== session.steps.length ||
      state.isComplete
    ) {
      return;
    }

    if (!serverCompletionConfirmed.current) {
      setCompletionError(
        'El backend no confirmó la finalización del TrainingRun',
      );
      return;
    }

    setCompletionError(null);
    dispatch({ type: 'SET_COMPLETE' });
  }, [
    isAnswered,
    isLastStep,
    session,
    state.answers.length,
    state.isComplete,
  ]);

  const next = useCallback(() => {
    if (isLastStep) {
      startCompletion();
      return;
    }

    dispatch({ type: 'NEXT_STEP' });
    setSelectedOptionId(null);
    setSelectedError(NO_ERROR_SELECTION);
    setFixCodeDraft(null);
    setExecutionError(null);
    setExecutionStatus('idle');
    setHintError(null);
    stepStartedAt.current = Date.now();
  }, [isLastStep, startCompletion]);

  const retryCompletion = useCallback(() => {
    startCompletion();
  }, [startCompletion]);

  return {
    session,
    currentStep,
    state,
    isLoading:
      (recovery.recoveryStatus === 'checking' || session === null) &&
      state.error === null,
    selectedOptionId,
    selectedError,
    fixCodeDraft,
    canSubmit:
      pendingAnswer !== null
      && !state.isValidating
      && !isRevealingHint,
    isAnswered,
    isLastStep,
    executionError,
    executionStatus,
    isCompleting: false,
    completionError,
    hintError,
    isRevealingHint,
    recoveryStatus: recovery.recoveryStatus,
    recoverySessionId: recovery.recoverySessionId,
    recoverySnapshot: recovery.recoverySnapshot,
    storageWarning: recovery.storageWarning,
    select,
    selectError,
    editCode,
    revealHint,
    submit,
    next,
    retryCompletion,
    continueRecovery: recovery.continueRecovery,
    startNewSession: recovery.startNewSession,
    retryRecoveryPersistence: recovery.retryRecoveryPersistence,
    abandonSession: recovery.abandonSession,
  };
}
