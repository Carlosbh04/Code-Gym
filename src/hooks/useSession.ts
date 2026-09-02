import { useCallback, useMemo, useReducer, useRef, useState } from 'react';
import { useCodeExecution } from '@/hooks/useCodeExecution';
import { useSessionCompletion } from '@/hooks/useSessionCompletion';
import {
  useSessionRecoveryController,
  type RecoveryStatus,
  type SessionStorageWarning,
} from '@/hooks/useSessionRecoveryController';
import { validateSelection } from '@/lib/engine/validation';
import {
  createInitialSessionState,
  sessionReducer,
} from '@/features/session/session-reducer';
import type {
  FindErrorSelection,
  SessionState,
} from '@/features/session/session-types';
import type { ExerciseSession, ExerciseStep, StepAnswer } from '@/types/exercise';

/**
 * Orquesta una sesión de ejercicios (§15, §18).
 *
 * Es la capa que §15 autoriza a hablar con el engine: la UI solo usa hooks y
 * contextos.
 *
 * Dos caminos de validación, y no por capricho:
 *
 * - Los tres tipos que se resuelven eligiendo usan `validateSelection` de
 *   `lib/engine/validation`, que es aritmética pura y síncrona: exactamente lo
 *   que `ExerciseEngine.validateSelection` delega.
 * - `fix-code` ejecuta código, así que pasa por `useCodeExecution`, que lleva
 *   al `ExerciseEngine` construido en `providers.tsx` y de ahí al Worker
 *   (D001, D017). Es asíncrono y puede fallar por infraestructura.
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
  /** true mientras se persiste la finalización completa (D018). */
  isCompleting: boolean;
  /** Fallo de persistencia de la finalización, separado del error de carga. */
  completionError: string | null;
  /** Estado del diálogo/estado de recuperación previo a iniciar la sesión. */
  recoveryStatus: RecoveryStatus;
  /** Identidad de la sesión recuperable, incluso si no coincide con la URL. */
  recoverySessionId: string | null;
  /** Aviso no bloqueante cuando la persistencia temporal no está disponible. */
  storageWarning: SessionStorageWarning | null;
  select: (optionId: string) => void;
  /** Guarda el código del paso fix-code en curso. No lo valida. */
  editCode: (code: string) => void;
  /** Pide la siguiente pista del paso actual, en el orden de `hints`. */
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
  const execution = useCodeExecution();
  const completion = useSessionCompletion();
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [selectedError, setSelectedError] =
    useState<FindErrorSelection>(NO_ERROR_SELECTION);
  const [fixCodeDraft, setFixCodeDraft] = useState<string | null>(null);
  const [executionError, setExecutionError] = useState<string | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);
  const [completionError, setCompletionError] = useState<string | null>(null);
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
  // Igual que la validación, la finalización necesita una guarda síncrona: dos
  // clics pueden entrar antes de que React publique isCompleting.
  const completionInFlight = useRef(false);
  const completionSucceeded = useRef(false);

  const onSessionReady = useCallback((resumedAt: number) => {
    stepStartedAt.current = resumedAt;
    completionInFlight.current = false;
    completionSucceeded.current = false;
    setSelectedOptionId(null);
    setSelectedError(NO_ERROR_SELECTION);
    setFixCodeDraft(null);
    setExecutionError(null);
    setCompletionError(null);
  }, []);

  const recovery = useSessionRecoveryController({
    requestedSessionId: sessionId,
    state,
    dispatch,
    onSessionReady,
  });
  const { session } = recovery;

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
   * Revela la siguiente pista (§6: una cada vez, en orden). El índice sale de
   * cuántas hay ya reveladas, así que no se salta ninguna ni se repite, y no
   * se pide ninguna más allá de las que declara el paso.
   */
  const revealHint = useCallback(() => {
    const next = state.hintsRevealed.length;

    if (currentStep === null || next >= currentStep.hints.length) {
      return;
    }

    dispatch({ type: 'REVEAL_HINT', payload: next });
  }, [currentStep, state.hintsRevealed.length]);

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
      validationInFlight.current
    ) {
      return;
    }

    const registrar = (isCorrect: boolean) => {
      dispatch({
        type: 'SUBMIT_ANSWER',
        payload: {
          stepId: currentStep.id,
          stepType: currentStep.type,
          answer: pendingAnswer,
          isCorrect,
          timeSpentMs: Date.now() - stepStartedAt.current,
          hintsUsed: state.hintsRevealed.length,
        },
      });
    };

    if (currentStep.type !== 'fix-code') {
      registrar(validateSelection(currentStep, pendingAnswer).isCorrect);
      return;
    }

    // fix-code ejecuta código: es asíncrono y puede fallar sin que la respuesta
    // sea mala. `isValidating` bloquea el doble envío, y el reducer además
    // rechaza SUBMIT_ANSWER mientras esté puesto.
    validationInFlight.current = true;
    setExecutionError(null);
    dispatch({ type: 'SET_VALIDATING', payload: true });

    void execution
      .validateFixCode(currentStep, pendingAnswer as string)
      .then((result) => {
        dispatch({ type: 'SET_VALIDATING', payload: false });
        registrar(result.isCorrect);
      })
      .catch((error: unknown) => {
        // §27: timeout, fallo del worker y executor destruido son recuperables
        // y reintentables. No se registran como respuesta: el intento no ha
        // llegado a producir veredicto.
        dispatch({ type: 'SET_VALIDATING', payload: false });
        setExecutionError(error instanceof Error ? error.message : String(error));
      })
      .finally(() => {
        validationInFlight.current = false;
      });
  }, [
    currentStep,
    execution,
    pendingAnswer,
    state.hintsRevealed.length,
    state.isValidating,
  ]);

  const startCompletion = useCallback(() => {
    if (
      session === null ||
      !isLastStep ||
      !isAnswered ||
      state.answers.length !== session.steps.length ||
      completionInFlight.current ||
      completionSucceeded.current
    ) {
      return;
    }

    completionInFlight.current = true;
    setIsCompleting(true);
    setCompletionError(null);

    // startTime distingue dos ejecuciones legítimas de la misma sesión y se
    // conserva en el recovery canónico que implementará T052.
    const operationId = `${session.id}:${state.startTime}`;

    void Promise.resolve()
      .then(() =>
        completion.completeSession(operationId, session, state.answers),
      )
      .then(() => {
        completionSucceeded.current = true;
        dispatch({ type: 'SET_COMPLETE' });
      })
      .catch((reason: unknown) => {
        setCompletionError(
          reason instanceof Error ? reason.message : String(reason),
        );
      })
      .finally(() => {
        completionInFlight.current = false;
        setIsCompleting(false);
      });
  }, [completion, isAnswered, isLastStep, session, state.answers, state.startTime]);

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
    canSubmit: pendingAnswer !== null && !state.isValidating,
    isAnswered,
    isLastStep,
    executionError,
    isCompleting,
    completionError,
    recoveryStatus: recovery.recoveryStatus,
    recoverySessionId: recovery.recoverySessionId,
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
