import { describe, expect, it } from 'vitest';
import type { FindErrorAnswer } from '@/types/exercise';
import type { UserAnswer } from '@/types/progress';
import { createInitialSessionState, sessionReducer } from './session-reducer';
import type { SessionState } from './session-types';

const answer = (n: number, isCorrect = true): UserAnswer => ({
  stepId: `step-${n}`,
  stepType: 'code-reading',
  answer: 'a',
  isCorrect,
  timeSpentMs: 1000 * n,
  hintsUsed: 0,
});

const initial = () => createInitialSessionState('js-arrays-map-vs-foreach-01', 1_000);

/** Estado con `n` pasos ya respondidos y el índice en el paso `n`. */
const answered = (n: number): SessionState => {
  let state = initial();
  for (let i = 0; i < n; i += 1) {
    state = sessionReducer(state, { type: 'SUBMIT_ANSWER', payload: answer(i) });
    state = sessionReducer(state, { type: 'NEXT_STEP' });
  }
  return state;
};

describe('sessionReducer (T028)', () => {
  describe('contrato de UserAnswer con la respuesta compuesta (D014)', () => {
    const compuesta: FindErrorAnswer = { line: 3, errorType: 'mutacion' };
    const respuestaFindError: UserAnswer = {
      stepId: 'step-find-error',
      stepType: 'find-error',
      answer: compuesta,
      isCorrect: true,
      timeSpentMs: 4200,
      hintsUsed: 1,
    };

    it('guarda la respuesta compuesta tal cual, sin aplanarla', () => {
      const state = sessionReducer(initial(), {
        type: 'SUBMIT_ANSWER',
        payload: respuestaFindError,
      });

      expect(state.answers).toHaveLength(1);
      expect(state.answers[0].answer).toEqual(compuesta);
      expect(state.answers[0]).toEqual(respuestaFindError);
    });

    it('conserva las dos mitades por separado y con su tipo', () => {
      const state = sessionReducer(initial(), {
        type: 'SUBMIT_ANSWER',
        payload: respuestaFindError,
      });
      const guardada = state.answers[0].answer as FindErrorAnswer;

      expect(typeof guardada.line).toBe('number');
      expect(typeof guardada.errorType).toBe('string');
      expect(guardada.line).toBe(3);
      expect(guardada.errorType).toBe('mutacion');
    });

    it('convive con las respuestas de un solo valor de los demás tipos', () => {
      let state = sessionReducer(initial(), { type: 'SUBMIT_ANSWER', payload: answer(0) });
      state = sessionReducer(state, { type: 'NEXT_STEP' });
      state = sessionReducer(state, {
        type: 'SUBMIT_ANSWER',
        payload: respuestaFindError,
      });

      expect(state.answers.map((a) => a.answer)).toEqual(['a', compuesta]);
    });

    it('isCorrect sigue siendo el veredicto del engine, no se recalcula aquí', () => {
      const fallada: UserAnswer = { ...respuestaFindError, isCorrect: false };
      const state = sessionReducer(initial(), { type: 'SUBMIT_ANSWER', payload: fallada });

      expect(state.answers[0].isCorrect).toBe(false);
      expect(state.answers[0].answer).toEqual(compuesta);
    });
  });

  describe('estado inicial', () => {
    it('parte de los valores exactos de SessionState', () => {
      expect(initial()).toEqual({
        sessionId: 'js-arrays-map-vs-foreach-01',
        currentStep: 0,
        answers: [],
        startTime: 1_000,
        elapsedMs: 0,
        hintsRevealed: [],
        isValidating: false,
        isComplete: false,
        error: null,
      });
    });

    it('no expone campos fuera del contrato', () => {
      expect(Object.keys(initial()).sort()).toEqual([
        'answers',
        'currentStep',
        'elapsedMs',
        'error',
        'hintsRevealed',
        'isComplete',
        'isValidating',
        'sessionId',
        'startTime',
      ]);
    });
  });

  describe('SUBMIT_ANSWER', () => {
    it('guarda la respuesta con su isCorrect tal como llega', () => {
      const state = sessionReducer(initial(), {
        type: 'SUBMIT_ANSWER',
        payload: answer(0, false),
      });

      expect(state.answers).toHaveLength(1);
      expect(state.answers[0].isCorrect).toBe(false);
      expect(state.answers[0]).toEqual(answer(0, false));
    });

    it('no recalcula la corrección: acepta cualquier valor recibido', () => {
      const correcta = sessionReducer(initial(), { type: 'SUBMIT_ANSWER', payload: answer(0, true) });
      const fallida = sessionReducer(initial(), { type: 'SUBMIT_ANSWER', payload: answer(0, false) });

      expect(correcta.answers[0].isCorrect).toBe(true);
      expect(fallida.answers[0].isCorrect).toBe(false);
    });

    it('acumula una respuesta por paso al avanzar', () => {
      const state = answered(3);

      expect(state.answers.map((a) => a.stepId)).toEqual(['step-0', 'step-1', 'step-2']);
      expect(state.currentStep).toBe(3);
    });

    it('transición inválida: no responde mientras isValidating es true', () => {
      const validando = sessionReducer(initial(), { type: 'SET_VALIDATING', payload: true });
      const state = sessionReducer(validando, { type: 'SUBMIT_ANSWER', payload: answer(0) });

      expect(state).toBe(validando);
      expect(state.answers).toEqual([]);
    });

    it('transición inválida: no duplica la respuesta del paso actual', () => {
      const una = sessionReducer(initial(), { type: 'SUBMIT_ANSWER', payload: answer(0) });
      const otra = sessionReducer(una, { type: 'SUBMIT_ANSWER', payload: answer(0, false) });

      expect(otra).toBe(una);
      expect(otra.answers).toHaveLength(1);
    });
  });

  describe('NEXT_STEP', () => {
    it('avanza cuando el paso actual está respondido', () => {
      const respondido = sessionReducer(initial(), { type: 'SUBMIT_ANSWER', payload: answer(0) });
      const state = sessionReducer(respondido, { type: 'NEXT_STEP' });

      expect(state.currentStep).toBe(1);
    });

    it('transición inválida: no avanza sin respuesta', () => {
      const state = initial();

      expect(sessionReducer(state, { type: 'NEXT_STEP' })).toBe(state);
    });

    it('tampoco avanza dos veces con una sola respuesta', () => {
      const respondido = sessionReducer(initial(), { type: 'SUBMIT_ANSWER', payload: answer(0) });
      const uno = sessionReducer(respondido, { type: 'NEXT_STEP' });
      const dos = sessionReducer(uno, { type: 'NEXT_STEP' });

      expect(dos).toBe(uno);
      expect(dos.currentStep).toBe(1);
    });
  });

  describe('las pistas son de un paso, no de la sesión (T033)', () => {
    it('NEXT_STEP vacía las pistas reveladas', () => {
      let state = sessionReducer(initial(), { type: 'SUBMIT_ANSWER', payload: answer(0) });
      state = sessionReducer(state, { type: 'REVEAL_HINT', payload: 0 });
      state = sessionReducer(state, { type: 'REVEAL_HINT', payload: 1 });
      expect(state.hintsRevealed).toEqual([0, 1]);

      state = sessionReducer(state, { type: 'NEXT_STEP' });

      expect(state.currentStep).toBe(1);
      expect(state.hintsRevealed).toEqual([]);
    });

    it('un NEXT_STEP rechazado no toca las pistas', () => {
      // Sin responder, §18 no deja avanzar: tampoco debe perderse el estado.
      let state = sessionReducer(initial(), { type: 'REVEAL_HINT', payload: 0 });
      const antes = state;

      state = sessionReducer(state, { type: 'NEXT_STEP' });

      expect(state).toBe(antes);
      expect(state.hintsRevealed).toEqual([0]);
    });

    it('cada paso cuenta sus propias pistas', () => {
      let state = initial();
      const contadas: number[] = [];

      for (let paso = 0; paso < 3; paso += 1) {
        for (let hint = 0; hint <= paso; hint += 1) {
          state = sessionReducer(state, { type: 'REVEAL_HINT', payload: hint });
        }
        contadas.push(state.hintsRevealed.length);
        state = sessionReducer(state, { type: 'SUBMIT_ANSWER', payload: answer(paso) });
        state = sessionReducer(state, { type: 'NEXT_STEP' });
      }

      expect(contadas).toEqual([1, 2, 3]);
    });
  });

  describe('REVEAL_HINT', () => {
    it('registra el índice de la pista', () => {
      const state = sessionReducer(initial(), { type: 'REVEAL_HINT', payload: 0 });

      expect(state.hintsRevealed).toEqual([0]);
    });

    it('acumula pistas distintas en orden', () => {
      let state = sessionReducer(initial(), { type: 'REVEAL_HINT', payload: 0 });
      state = sessionReducer(state, { type: 'REVEAL_HINT', payload: 2 });

      expect(state.hintsRevealed).toEqual([0, 2]);
    });

    it('no repite una pista ya revelada', () => {
      const una = sessionReducer(initial(), { type: 'REVEAL_HINT', payload: 1 });
      const otra = sessionReducer(una, { type: 'REVEAL_HINT', payload: 1 });

      expect(otra).toBe(una);
    });
  });

  describe('SET_VALIDATING', () => {
    it('activa y desactiva el indicador', () => {
      const activo = sessionReducer(initial(), { type: 'SET_VALIDATING', payload: true });
      expect(activo.isValidating).toBe(true);
      expect(sessionReducer(activo, { type: 'SET_VALIDATING', payload: false }).isValidating).toBe(false);
    });
  });

  describe('SET_COMPLETE', () => {
    it('completa cuando el paso actual está respondido', () => {
      const respondido = sessionReducer(initial(), { type: 'SUBMIT_ANSWER', payload: answer(0) });
      const state = sessionReducer(respondido, { type: 'SET_COMPLETE' });

      expect(state.isComplete).toBe(true);
    });

    it('transición inválida: no completa con el paso actual sin responder', () => {
      const state = initial();

      expect(sessionReducer(state, { type: 'SET_COMPLETE' })).toBe(state);
      expect(sessionReducer(answered(2), { type: 'SET_COMPLETE' }).isComplete).toBe(false);
    });
  });

  describe('SET_ERROR', () => {
    it('guarda el mensaje recibido sin transformarlo', () => {
      const state = sessionReducer(initial(), { type: 'SET_ERROR', payload: 'Sesión no encontrada: x' });

      expect(state.error).toBe('Sesión no encontrada: x');
    });
  });

  describe('RESTORE', () => {
    it('aplica solo los campos recibidos', () => {
      const state = sessionReducer(initial(), {
        type: 'RESTORE',
        payload: { currentStep: 2, elapsedMs: 45_000, answers: [answer(0), answer(1)] },
      });

      expect(state.currentStep).toBe(2);
      expect(state.elapsedMs).toBe(45_000);
      expect(state.answers).toHaveLength(2);
      expect(state.sessionId).toBe('js-arrays-map-vs-foreach-01');
      expect(state.isComplete).toBe(false);
    });

    it('un payload vacío no cambia nada', () => {
      const state = initial();

      expect(sessionReducer(state, { type: 'RESTORE', payload: {} })).toEqual(state);
    });
  });

  describe('RESET', () => {
    it('vuelve al inicio conservando sesión y hora de comienzo', () => {
      const avanzado = sessionReducer(answered(2), { type: 'REVEAL_HINT', payload: 0 });
      const state = sessionReducer(avanzado, { type: 'RESET' });

      expect(state).toEqual(initial());
    });

    it('limpia también el error', () => {
      const conError = sessionReducer(initial(), { type: 'SET_ERROR', payload: 'roto' });

      expect(sessionReducer(conError, { type: 'RESET' }).error).toBeNull();
    });
  });

  describe('pureza', () => {
    it('no muta el estado anterior', () => {
      const state = initial();
      const antes = JSON.stringify(state);

      sessionReducer(state, { type: 'SUBMIT_ANSWER', payload: answer(0) });
      sessionReducer(state, { type: 'REVEAL_HINT', payload: 0 });
      sessionReducer(state, { type: 'SET_ERROR', payload: 'x' });
      sessionReducer(state, { type: 'RESET' });

      expect(JSON.stringify(state)).toBe(antes);
    });

    it('no muta los arrays previos al añadir', () => {
      const uno = sessionReducer(initial(), { type: 'SUBMIT_ANSWER', payload: answer(0) });
      const dos = sessionReducer(sessionReducer(uno, { type: 'NEXT_STEP' }), {
        type: 'SUBMIT_ANSWER',
        payload: answer(1),
      });

      expect(uno.answers).toHaveLength(1);
      expect(dos.answers).not.toBe(uno.answers);
    });

    it('es determinista', () => {
      const state = answered(1);
      const accion = { type: 'SUBMIT_ANSWER', payload: answer(1) } as const;

      expect(sessionReducer(state, accion)).toEqual(sessionReducer(state, accion));
    });

    it('devuelve el mismo objeto cuando la acción no aplica', () => {
      const state = initial();

      expect(sessionReducer(state, { type: 'NEXT_STEP' })).toBe(state);
      expect(sessionReducer(state, { type: 'SET_COMPLETE' })).toBe(state);
    });
  });
});
