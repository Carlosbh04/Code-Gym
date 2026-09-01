import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useContent } from '@/hooks/useContent';
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
 * contextos. Carga el contenido por el ContentContext, valida con la regla del
 * engine y guarda el resultado en el reducer.
 *
 * Sobre la validación: se usa `validateSelection` de `lib/engine/validation`,
 * que es exactamente lo que `ExerciseEngine.validateSelection` delega. No se
 * instancia el engine porque su constructor exige un `IContentRepository` que
 * esta capa no puede obtener: el ContentContext no lo expone y §15 prohíbe a
 * los hooks usar implementaciones concretas. §35 asigna esa creación a
 * `providers.tsx` (T049).
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
  select: (optionId: string) => void;
  /** Guarda el código del paso fix-code en curso. No lo valida: eso es T042. */
  editCode: (code: string) => void;
  /** Pide la siguiente pista del paso actual, en el orden de `hints`. */
  revealHint: () => void;
  selectError: (next: FindErrorSelection) => void;
  submit: () => void;
  next: () => void;
}

export function useSession(sessionId: string): UseSessionResult {
  const content = useContent();
  const [session, setSession] = useState<ExerciseSession | null>(null);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [selectedError, setSelectedError] =
    useState<FindErrorSelection>(NO_ERROR_SELECTION);
  const [fixCodeDraft, setFixCodeDraft] = useState<string | null>(null);
  const [state, dispatch] = useReducer(
    sessionReducer,
    createInitialSessionState(sessionId, 0),
  );

  // El reloj no puede leerse durante el render: se fija al montar y al cambiar
  // de paso, que son momentos donde la impureza sí es legítima.
  const stepStartedAt = useRef(0);

  useEffect(() => {
    let active = true;

    content
      .getSession(sessionId)
      .then((loaded) => {
        if (!active) return;

        if (loaded === null) {
          dispatch({ type: 'SET_ERROR', payload: `Sesión no encontrada: ${sessionId}` });
          return;
        }

        const now = Date.now();
        setSession(loaded);
        stepStartedAt.current = now;
        dispatch({ type: 'RESTORE', payload: { startTime: now } });
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
  }, [content, sessionId]);

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

    // fix-code no entra aquí: su validación ejecuta código y llega en T042,
    // así que el paso se edita pero todavía no se puede comprobar.
    if (currentStep.type !== 'find-error') return selectedOptionId;

    const { line, errorType } = selectedError;
    return line !== null && errorType !== null ? { line, errorType } : null;
  }, [currentStep, selectedError, selectedOptionId]);

  const submit = useCallback(() => {
    if (currentStep === null || pendingAnswer === null) {
      return;
    }

    const result = validateSelection(currentStep, pendingAnswer);

    dispatch({
      type: 'SUBMIT_ANSWER',
      payload: {
        stepId: currentStep.id,
        stepType: currentStep.type,
        answer: pendingAnswer,
        isCorrect: result.isCorrect,
        timeSpentMs: Date.now() - stepStartedAt.current,
        hintsUsed: state.hintsRevealed.length,
      },
    });
  }, [currentStep, pendingAnswer, state.hintsRevealed.length]);

  const next = useCallback(() => {
    if (isLastStep) {
      dispatch({ type: 'SET_COMPLETE' });
      return;
    }

    dispatch({ type: 'NEXT_STEP' });
    setSelectedOptionId(null);
    setSelectedError(NO_ERROR_SELECTION);
    setFixCodeDraft(null);
    stepStartedAt.current = Date.now();
  }, [isLastStep]);

  return {
    session,
    currentStep,
    state,
    isLoading: session === null && state.error === null,
    selectedOptionId,
    selectedError,
    fixCodeDraft,
    canSubmit: pendingAnswer !== null,
    isAnswered,
    isLastStep,
    select,
    selectError,
    editCode,
    revealHint,
    submit,
    next,
  };
}
