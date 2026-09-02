import { StrictMode, type ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { ContentProvider } from '@/contexts/ContentContext';
import { ExecutionProvider } from '@/contexts/ExecutionContext';
import { SessionCompletionContext } from '@/contexts/session-completion-context';
import { SessionRecoveryContext } from '@/contexts/session-recovery-context';
import { StaticContentRepository } from '@/lib/repositories/StaticContentRepository';
import type { SessionRecoverySnapshot } from '@/lib/recovery/ISessionRecoveryStore';
import { FakeExecution } from '@/test/fake-execution';
import { FakeSessionCompletion } from '@/test/fake-session-completion';
import { FakeSessionRecoveryStore } from '@/test/fake-session-recovery';
import { useSession } from './useSession';

/**
 * Lo que este fichero cubre y SessionPage.test.tsx no puede: `hintsUsed` y
 * `executionError` viven dentro del estado del hook y la página no los expone
 * como tales.
 */

const repo = new StaticContentRepository();
const SESSION_ID = 'js-arrays-map-vs-foreach-01';

const montar = (
  execution: FakeExecution = new FakeExecution(),
  completion: FakeSessionCompletion = new FakeSessionCompletion(),
  recovery: FakeSessionRecoveryStore = new FakeSessionRecoveryStore(),
  strict = false,
) => {
  const wrapper = ({ children }: { children: ReactNode }) => {
    const providers = (
      <SessionRecoveryContext.Provider value={recovery}>
        <SessionCompletionContext.Provider value={completion.value}>
          <ContentProvider repository={repo}>
            <ExecutionProvider engine={execution.value}>{children}</ExecutionProvider>
          </ContentProvider>
        </SessionCompletionContext.Provider>
      </SessionRecoveryContext.Provider>
    );

    return strict ? <StrictMode>{providers}</StrictMode> : providers;
  };

  return renderHook(() => useSession(SESSION_ID), { wrapper });
};

const loaded = async (
  execution?: FakeExecution,
  completion?: FakeSessionCompletion,
  recovery?: FakeSessionRecoveryStore,
) => {
  const view = montar(execution, completion, recovery);
  await waitFor(() => expect(view.result.current.session).not.toBeNull());
  return view;
};

/** Solución real del paso fix-code de la sesión de test. */
const SOLUCION = 'function dobles(numeros) {\n  return numeros.map((n) => n * 2);\n}';

afterEach(() => {
  vi.restoreAllMocks();
});

const recoverableSnapshot = async (): Promise<SessionRecoverySnapshot> => {
  const session = await repo.getSessionById(SESSION_ID);
  if (session === null) throw new Error('Falta la sesión fixture');

  return {
    sessionId: SESSION_ID,
    currentStep: 1,
    answers: [
      {
        stepId: session.steps[0].id,
        stepType: session.steps[0].type,
        answer: 'b',
        isCorrect: true,
        timeSpentMs: 2_000,
        hintsUsed: 0,
      },
    ],
    elapsedMs: 3_000,
    hintsRevealed: [],
    startTime: 1_000,
  };
};

/** Avanza los tres pasos de selección y deja el hook en el paso fix-code. */
const hastaFixCode = async (
  execution: FakeExecution,
  completion?: FakeSessionCompletion,
  recovery?: FakeSessionRecoveryStore,
) => {
  const view = await loaded(execution, completion, recovery);

  act(() => view.result.current.select('b'));
  act(() => view.result.current.submit());
  await waitFor(() => expect(view.result.current.state.answers).toHaveLength(1));
  act(() => view.result.current.next());

  act(() => view.result.current.select('a'));
  act(() => view.result.current.submit());
  await waitFor(() => expect(view.result.current.state.answers).toHaveLength(2));
  act(() => view.result.current.next());

  act(() => view.result.current.selectError({ line: 2, errorType: 'conceptual' }));
  act(() => view.result.current.submit());
  await waitFor(() => expect(view.result.current.state.answers).toHaveLength(3));
  act(() => view.result.current.next());

  await waitFor(() => expect(view.result.current.currentStep?.type).toBe('fix-code'));
  return view;
};

describe('useSession · pistas (T033)', () => {
  it('revela una pista cada vez, en orden y sin saltarse ninguna', async () => {
    const { result } = await loaded();
    const total = result.current.currentStep!.hints.length;
    expect(total).toBeGreaterThan(1);

    for (let i = 0; i < total; i += 1) {
      act(() => result.current.revealHint());
      await waitFor(() =>
        expect(result.current.state.hintsRevealed).toHaveLength(i + 1),
      );
    }

    expect(result.current.state.hintsRevealed).toEqual(
      Array.from({ length: total }, (_, i) => i),
    );
  });

  it('no revela más pistas de las que declara el paso', async () => {
    const { result } = await loaded();
    const total = result.current.currentStep!.hints.length;

    for (let i = 0; i < total + 5; i += 1) {
      act(() => result.current.revealHint());
    }

    await waitFor(() =>
      expect(result.current.state.hintsRevealed).toHaveLength(total),
    );
  });

  it('no duplica REVEAL_HINT: el índice sale de las ya reveladas', async () => {
    const { result } = await loaded();

    act(() => result.current.revealHint());
    await waitFor(() => expect(result.current.state.hintsRevealed).toEqual([0]));

    act(() => result.current.revealHint());
    await waitFor(() => expect(result.current.state.hintsRevealed).toEqual([0, 1]));

    expect(new Set(result.current.state.hintsRevealed).size).toBe(
      result.current.state.hintsRevealed.length,
    );
  });

  it('hintsUsed coincide exactamente con las pistas reveladas en ese paso', async () => {
    const { result } = await loaded();
    const step = result.current.currentStep!;

    act(() => result.current.revealHint());
    act(() => result.current.revealHint());
    await waitFor(() => expect(result.current.state.hintsRevealed).toHaveLength(2));

    act(() => result.current.select(step.options![0].id));
    act(() => result.current.submit());

    await waitFor(() => expect(result.current.state.answers).toHaveLength(1));
    expect(result.current.state.answers[0].hintsUsed).toBe(2);
  });

  it('responder sin pistas registra hintsUsed 0', async () => {
    const { result } = await loaded();
    const step = result.current.currentStep!;

    act(() => result.current.select(step.options![0].id));
    act(() => result.current.submit());

    await waitFor(() => expect(result.current.state.answers).toHaveLength(1));
    expect(result.current.state.answers[0].hintsUsed).toBe(0);
  });

  it('las pistas no se arrastran de un paso al siguiente', async () => {
    const { result } = await loaded();
    const primero = result.current.currentStep!;

    act(() => result.current.revealHint());
    act(() => result.current.revealHint());
    await waitFor(() => expect(result.current.state.hintsRevealed).toHaveLength(2));

    act(() => result.current.select(primero.options![0].id));
    act(() => result.current.submit());
    await waitFor(() => expect(result.current.state.answers).toHaveLength(1));
    act(() => result.current.next());

    await waitFor(() => expect(result.current.state.currentStep).toBe(1));
    expect(result.current.state.hintsRevealed).toEqual([]);

    // Y el segundo paso cuenta solo las suyas.
    act(() => result.current.revealHint());
    await waitFor(() => expect(result.current.state.hintsRevealed).toEqual([0]));

    const segundo = result.current.currentStep!;
    act(() => result.current.select(segundo.options![0].id));
    act(() => result.current.submit());

    await waitFor(() => expect(result.current.state.answers).toHaveLength(2));
    expect(result.current.state.answers.map((a) => a.hintsUsed)).toEqual([2, 1]);
  });
});

describe('useSession · fix-code (T045.1)', () => {
  it('el código editado llega al canal de ejecución y su veredicto se registra', async () => {
    const execution = new FakeExecution();
    execution.resuelve(true);
    const view = await hastaFixCode(execution);

    act(() => view.result.current.editCode(SOLUCION));
    await waitFor(() => expect(view.result.current.canSubmit).toBe(true));

    act(() => view.result.current.submit());

    await waitFor(() => expect(view.result.current.state.answers).toHaveLength(4));
    expect(execution.llamadas).toHaveLength(1);
    expect(execution.llamadas[0].userCode).toBe(SOLUCION);
    expect(execution.llamadas[0].step.type).toBe('fix-code');
    expect(view.result.current.state.answers[3]).toMatchObject({
      stepType: 'fix-code',
      answer: SOLUCION,
      isCorrect: true,
    });
  });

  it('un rechazo de infraestructura no es respuesta: queda executionError y sin registro', async () => {
    const execution = new FakeExecution();
    execution.rechaza('La ejecución superó el límite de 3000 ms');
    const view = await hastaFixCode(execution);

    act(() => view.result.current.editCode(SOLUCION));
    act(() => view.result.current.submit());

    await waitFor(() =>
      expect(view.result.current.executionError).toBe(
        'La ejecución superó el límite de 3000 ms',
      ),
    );

    // §27: recuperable y reintentable. El intento no llegó a veredicto, así
    // que no cuenta como respuesta ni bloquea el paso.
    expect(view.result.current.state.answers).toHaveLength(3);
    expect(view.result.current.state.isValidating).toBe(false);
    expect(view.result.current.canSubmit).toBe(true);
  });

  it('reintentar tras el fallo registra la respuesta y limpia el error', async () => {
    const execution = new FakeExecution();
    execution.rechaza('El worker falló durante la ejecución');
    const view = await hastaFixCode(execution);

    act(() => view.result.current.editCode(SOLUCION));
    act(() => view.result.current.submit());
    await waitFor(() => expect(view.result.current.executionError).not.toBeNull());

    execution.resuelve(false);
    act(() => view.result.current.submit());

    await waitFor(() => expect(view.result.current.state.answers).toHaveLength(4));
    expect(view.result.current.executionError).toBeNull();
    expect(view.result.current.state.answers[3].isCorrect).toBe(false);
  });

  it('isValidating en curso bloquea el doble envío', async () => {
    const execution = new FakeExecution();
    execution.diferir();
    const view = await hastaFixCode(execution);

    act(() => view.result.current.editCode(SOLUCION));
    // Dos invocaciones síncronas caben antes del siguiente render: la guarda
    // interna, no solo el botón deshabilitado, debe impedir la segunda.
    act(() => {
      view.result.current.submit();
      view.result.current.submit();
    });
    await waitFor(() => expect(view.result.current.state.isValidating).toBe(true));

    // Ni el segundo envío inmediato ni otro posterior se ejecutan.
    act(() => view.result.current.submit());
    expect(execution.llamadas).toHaveLength(1);
    expect(view.result.current.state.answers).toHaveLength(3);

    act(() => execution.resolverDiferido(true));
    await waitFor(() => expect(view.result.current.state.answers).toHaveLength(4));
    expect(view.result.current.state.isValidating).toBe(false);
  });
});

describe('useSession · finalización persistida (T050)', () => {
  const answerLastStep = async (
    execution: FakeExecution,
    completion: FakeSessionCompletion,
    recovery?: FakeSessionRecoveryStore,
  ) => {
    execution.resuelve(true);
    const view = await hastaFixCode(execution, completion, recovery);

    act(() => view.result.current.editCode(SOLUCION));
    act(() => view.result.current.submit());
    await waitFor(() =>
      expect(view.result.current.state.answers).toHaveLength(4),
    );
    return view;
  };

  it('solo marca complete tras persistir y bloquea dos llamadas simultáneas', async () => {
    const completion = new FakeSessionCompletion();
    const recovery = new FakeSessionRecoveryStore();
    completion.defer();
    const view = await answerLastStep(new FakeExecution(), completion, recovery);
    let wasCompleteWhenCleared = false;
    recovery.onClear = () => {
      wasCompleteWhenCleared = view.result.current.state.isComplete;
    };

    act(() => {
      view.result.current.next();
      view.result.current.next();
    });

    await waitFor(() => expect(view.result.current.isCompleting).toBe(true));
    expect(completion.calls).toHaveLength(1);
    expect(completion.calls[0].operationId).toMatch(
      /^js-arrays-map-vs-foreach-01:\d+$/,
    );
    expect(view.result.current.state.isComplete).toBe(false);

    act(() => completion.resolve());
    await waitFor(() => expect(view.result.current.state.isComplete).toBe(true));
    await waitFor(() => expect(recovery.clearCalls).toBe(1));
    expect(wasCompleteWhenCleared).toBe(true);
    expect(view.result.current.isCompleting).toBe(false);
    expect(completion.calls).toHaveLength(1);
  });

  it('expone el fallo, conserva answers y permite retry sin usar state.error', async () => {
    const completion = new FakeSessionCompletion();
    const recovery = new FakeSessionRecoveryStore();
    completion.failOnce('Cuota de almacenamiento agotada');
    const view = await answerLastStep(new FakeExecution(), completion, recovery);

    act(() => view.result.current.next());
    await waitFor(() =>
      expect(view.result.current.completionError).toBe(
        'Cuota de almacenamiento agotada',
      ),
    );

    expect(view.result.current.state.isComplete).toBe(false);
    expect(view.result.current.state.error).toBeNull();
    expect(view.result.current.state.answers).toHaveLength(4);
    expect(recovery.clearCalls).toBe(0);
    expect(recovery.snapshot?.answers).toHaveLength(4);

    act(() => view.result.current.retryCompletion());
    await waitFor(() => expect(view.result.current.state.isComplete).toBe(true));
    await waitFor(() => expect(recovery.clearCalls).toBe(1));

    expect(completion.calls).toHaveLength(2);
    expect(completion.calls[1].operationId).toBe(
      completion.calls[0].operationId,
    );
    expect(view.result.current.completionError).toBeNull();
    expect(view.result.current.state.answers).toHaveLength(4);
  });

  it('si falla el cleanup por cuota, mantiene complete y permite reintentar el borrado', async () => {
    const completion = new FakeSessionCompletion();
    const recovery = new FakeSessionRecoveryStore();
    recovery.clearError = 'STORAGE_FULL';
    const view = await answerLastStep(new FakeExecution(), completion, recovery);

    act(() => view.result.current.next());
    await waitFor(() => expect(view.result.current.state.isComplete).toBe(true));
    await waitFor(() =>
      expect(view.result.current.storageWarning).toMatchObject({
        code: 'STORAGE_FULL',
        canRetry: true,
      }),
    );
    expect(recovery.clearCalls).toBe(1);

    recovery.clearError = null;
    act(() => view.result.current.retryRecoveryPersistence());

    await waitFor(() => expect(view.result.current.storageWarning).toBeNull());
    expect(recovery.clearCalls).toBe(2);
    expect(recovery.snapshot).toBeNull();
  });
});

describe('useSession · sessionStorage recovery (T052)', () => {
  it('inspecciona antes de crear y persiste el estado inicial canónico', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(5_000);
    const recovery = new FakeSessionRecoveryStore();
    const view = await loaded(undefined, undefined, recovery);

    await waitFor(() => expect(recovery.saves).toHaveLength(1));
    expect(recovery.loadCalls).toBe(1);
    expect(recovery.saves[0]).toEqual({
      sessionId: SESSION_ID,
      currentStep: 0,
      answers: [],
      elapsedMs: 0,
      hintsRevealed: [],
      startTime: 5_000,
    });
    expect(view.result.current.recoveryStatus).toBe('none');
  });

  it('ofrece un recovery válido sin sobrescribirlo y lo restaura completo', async () => {
    const recovery = new FakeSessionRecoveryStore();
    recovery.snapshot = await recoverableSnapshot();
    const view = montar(undefined, undefined, recovery);

    await waitFor(() =>
      expect(view.result.current.recoveryStatus).toBe('available'),
    );
    expect(view.result.current.session).toBeNull();
    expect(recovery.saves).toHaveLength(0);

    act(() => view.result.current.continueRecovery());
    await waitFor(() => expect(view.result.current.session).not.toBeNull());

    expect(view.result.current.state).toMatchObject({
      sessionId: SESSION_ID,
      currentStep: 1,
      elapsedMs: 3_000,
      startTime: 1_000,
      isComplete: false,
      isValidating: false,
      error: null,
    });
    expect(view.result.current.state.answers[0].isCorrect).toBe(true);
  });

  it('conserva elapsedMs previo y suma solo el tiempo desde la reanudación', async () => {
    let now = 10_000;
    vi.spyOn(Date, 'now').mockImplementation(() => now);
    const recovery = new FakeSessionRecoveryStore();
    recovery.snapshot = await recoverableSnapshot();
    const view = montar(undefined, undefined, recovery);

    await waitFor(() =>
      expect(view.result.current.recoveryStatus).toBe('available'),
    );
    act(() => view.result.current.continueRecovery());
    await waitFor(() => expect(view.result.current.session).not.toBeNull());
    await waitFor(() => expect(recovery.saves.at(-1)?.elapsedMs).toBe(3_000));

    now = 12_500;
    act(() => view.result.current.revealHint());
    await waitFor(() => expect(recovery.saves.at(-1)?.elapsedMs).toBe(5_500));
    expect(view.result.current.state.startTime).toBe(1_000);
  });

  it('no incluye en elapsedMs el tiempo transcurrido con la sesión cerrada', async () => {
    let now = 50_000;
    vi.spyOn(Date, 'now').mockImplementation(() => now);
    const recovery = new FakeSessionRecoveryStore();
    recovery.snapshot = { ...(await recoverableSnapshot()), elapsedMs: 7_000 };
    const view = montar(undefined, undefined, recovery);

    await waitFor(() =>
      expect(view.result.current.recoveryStatus).toBe('available'),
    );
    act(() => view.result.current.continueRecovery());
    await waitFor(() => expect(view.result.current.session).not.toBeNull());

    now = 51_200;
    act(() => view.result.current.revealHint());
    await waitFor(() => expect(recovery.saves.at(-1)?.elapsedMs).toBe(8_200));
  });

  it('clasifica recovery incompatible con el contenido sin restaurarlo parcialmente', async () => {
    const recovery = new FakeSessionRecoveryStore();
    const snapshot = await recoverableSnapshot();
    recovery.snapshot = {
      ...snapshot,
      answers: [{ ...snapshot.answers[0], stepId: 'step-inexistente' }],
    };
    const view = montar(undefined, undefined, recovery);

    await waitFor(() =>
      expect(view.result.current.recoveryStatus).toBe('available'),
    );
    act(() => view.result.current.continueRecovery());
    await waitFor(() =>
      expect(view.result.current.recoveryStatus).toBe('recovery-failed'),
    );

    expect(view.result.current.session).toBeNull();
    expect(recovery.clearCalls).toBe(0);
    expect(recovery.snapshot).not.toBeNull();
  });

  it('INVALID_JSON bloquea la carga y conserva los datos hasta decisión externa', async () => {
    const recovery = new FakeSessionRecoveryStore();
    recovery.loadError = 'INVALID_JSON';
    const view = montar(undefined, undefined, recovery);

    await waitFor(() =>
      expect(view.result.current.recoveryStatus).toBe('invalid-json'),
    );
    expect(view.result.current.session).toBeNull();
    expect(recovery.clearCalls).toBe(0);
    expect(recovery.saves).toHaveLength(0);
  });

  it('RECOVERY_FAILED permite descartar explícitamente y empezar nuevo', async () => {
    const recovery = new FakeSessionRecoveryStore();
    recovery.loadError = 'RECOVERY_FAILED';
    const view = montar(undefined, undefined, recovery);

    await waitFor(() =>
      expect(view.result.current.recoveryStatus).toBe('recovery-failed'),
    );
    recovery.loadError = null;
    act(() => view.result.current.startNewSession());

    await waitFor(() => expect(view.result.current.session).not.toBeNull());
    expect(recovery.clearCalls).toBe(1);
    await waitFor(() => expect(recovery.saves).toHaveLength(1));
  });

  it('STORAGE_UNAVAILABLE continúa en memoria y evita loops de escritura', async () => {
    const recovery = new FakeSessionRecoveryStore();
    recovery.loadError = 'STORAGE_UNAVAILABLE';
    const view = await loaded(undefined, undefined, recovery);

    expect(view.result.current.storageWarning).toMatchObject({
      code: 'STORAGE_UNAVAILABLE',
      canRetry: false,
    });
    expect(recovery.saves).toHaveLength(0);

    act(() => view.result.current.revealHint());
    await waitFor(() =>
      expect(view.result.current.state.hintsRevealed).toEqual([0]),
    );
    expect(recovery.saves).toHaveLength(0);
  });

  it('STORAGE_FULL conserva memoria, pausa escrituras y permite retry', async () => {
    const recovery = new FakeSessionRecoveryStore();
    recovery.saveError = 'STORAGE_FULL';
    const view = await loaded(undefined, undefined, recovery);

    await waitFor(() =>
      expect(view.result.current.storageWarning).toMatchObject({
        code: 'STORAGE_FULL',
        canRetry: true,
      }),
    );
    expect(recovery.saves).toHaveLength(1);

    act(() => view.result.current.revealHint());
    await waitFor(() =>
      expect(view.result.current.state.hintsRevealed).toEqual([0]),
    );
    expect(recovery.saves).toHaveLength(1);

    recovery.saveError = null;
    act(() => view.result.current.retryRecoveryPersistence());

    await waitFor(() => expect(view.result.current.storageWarning).toBeNull());
    expect(recovery.saves).toHaveLength(2);
    expect(recovery.snapshot?.hintsRevealed).toEqual([0]);
  });

  it('unmount y remount no borran ni sobrescriben recovery válido', async () => {
    const recovery = new FakeSessionRecoveryStore();
    const first = await loaded(undefined, undefined, recovery);
    await waitFor(() => expect(recovery.snapshot).not.toBeNull());
    const savesBefore = recovery.saves.length;

    first.unmount();
    expect(recovery.clearCalls).toBe(0);

    const second = montar(undefined, undefined, recovery);
    await waitFor(() =>
      expect(second.result.current.recoveryStatus).toBe('available'),
    );
    expect(recovery.saves).toHaveLength(savesBefore);
    expect(recovery.clearCalls).toBe(0);
  });

  it('StrictMode inspecciona una vez y no destruye un recovery pendiente', async () => {
    const recovery = new FakeSessionRecoveryStore();
    recovery.snapshot = await recoverableSnapshot();
    const view = montar(undefined, undefined, recovery, true);

    await waitFor(() =>
      expect(view.result.current.recoveryStatus).toBe('available'),
    );
    expect(recovery.loadCalls).toBe(1);
    expect(recovery.saves).toHaveLength(0);
    expect(recovery.clearCalls).toBe(0);
  });

  it('solo abandona y borra mediante la capacidad explícita', async () => {
    const recovery = new FakeSessionRecoveryStore();
    const view = await loaded(undefined, undefined, recovery);

    act(() => view.result.current.abandonSession());

    expect(recovery.clearCalls).toBe(1);
    expect(recovery.snapshot).toBeNull();
  });
});
