import type { SessionAction, SessionState } from './session-types';

/**
 * Reducer del estado de sesión (§18, D004).
 *
 * Lógica pura: sin React, DOM, repositorios, almacenamiento, red ni Worker. No
 * valida respuestas — solo guarda el resultado que le llega ya calculado, según
 * la cadena que fija §24 y refuerza D012.
 *
 * `startTime` se inyecta al crear el estado inicial porque leer el reloj haría
 * impuro al reducer.
 */

export function createInitialSessionState(
  sessionId: string,
  startTime: number,
): SessionState {
  return {
    sessionId,
    currentStep: 0,
    answers: [],
    startTime,
    elapsedMs: 0,
    hintsRevealed: [],
    isValidating: false,
    isComplete: false,
    error: null,
  };
}

/**
 * Las respuestas se acumulan en orden, una por paso, así que
 * `answers[currentStep]` es la del paso actual y su existencia se comprueba con
 * la longitud. Es lo único que permite el estado: `SessionState` no guarda la
 * sesión ni su número de pasos.
 */
function currentStepIsAnswered(state: SessionState): boolean {
  return state.answers.length > state.currentStep;
}

export function sessionReducer(
  state: SessionState,
  action: SessionAction,
): SessionState {
  switch (action.type) {
    case 'SUBMIT_ANSWER': {
      // §18: no se puede responder mientras hay una validación en curso.
      // Y una respuesta por paso: repetir la acción no duplica la entrada.
      if (state.isValidating || currentStepIsAnswered(state)) {
        return state;
      }

      return { ...state, answers: [...state.answers, action.payload] };
    }

    case 'NEXT_STEP': {
      // §18: no se avanza sin haber respondido el paso actual.
      if (!currentStepIsAnswered(state)) {
        return state;
      }

      // Las pistas son de un paso, no de la sesión: §6 las declara en
      // ExerciseStep.hints y §17 registra hintsUsed en cada UserAnswer. Sin
      // vaciarlas aquí, el paso siguiente arrancaría con las suyas ya
      // reveladas y contaría pistas que nadie pidió.
      return { ...state, currentStep: state.currentStep + 1, hintsRevealed: [] };
    }

    case 'REVEAL_HINT': {
      if (state.hintsRevealed.includes(action.payload)) {
        return state;
      }

      return { ...state, hintsRevealed: [...state.hintsRevealed, action.payload] };
    }

    case 'SET_VALIDATING':
      return { ...state, isValidating: action.payload };

    case 'SET_COMPLETE': {
      // §18 pide no completar con pasos sin responder. El reducer no conoce el
      // total de pasos, así que comprueba lo único que el estado permite: que
      // el paso actual esté respondido. Cerrar la sesión en el último paso es
      // responsabilidad de quien orquesta.
      if (!currentStepIsAnswered(state)) {
        return state;
      }

      return { ...state, isComplete: true };
    }

    case 'SET_ERROR':
      return { ...state, error: action.payload };

    case 'RESTORE':
      return { ...state, ...action.payload };

    case 'RESET':
      // Conserva la identidad de la sesión y su inicio: el reducer no puede
      // leer el reloj para calcular uno nuevo.
      return createInitialSessionState(state.sessionId, state.startTime);
  }
}
