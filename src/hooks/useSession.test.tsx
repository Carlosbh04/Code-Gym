import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { ContentProvider } from '@/contexts/ContentContext';
import { ExecutionProvider } from '@/contexts/ExecutionContext';
import { SessionCompletionContext } from '@/contexts/session-completion-context';
import { StaticContentRepository } from '@/lib/repositories/StaticContentRepository';
import { FakeExecution } from '@/test/fake-execution';
import { FakeSessionCompletion } from '@/test/fake-session-completion';
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
) => {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <SessionCompletionContext.Provider value={completion.value}>
      <ContentProvider repository={repo}>
        <ExecutionProvider engine={execution.value}>{children}</ExecutionProvider>
      </ContentProvider>
    </SessionCompletionContext.Provider>
  );

  return renderHook(() => useSession(SESSION_ID), { wrapper });
};

const loaded = async (
  execution?: FakeExecution,
  completion?: FakeSessionCompletion,
) => {
  const view = montar(execution, completion);
  await waitFor(() => expect(view.result.current.session).not.toBeNull());
  return view;
};

/** Solución real del paso fix-code de la sesión de test. */
const SOLUCION = 'function dobles(numeros) {\n  return numeros.map((n) => n * 2);\n}';

/** Avanza los tres pasos de selección y deja el hook en el paso fix-code. */
const hastaFixCode = async (
  execution: FakeExecution,
  completion?: FakeSessionCompletion,
) => {
  const view = await loaded(execution, completion);

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
  ) => {
    execution.resuelve(true);
    const view = await hastaFixCode(execution, completion);

    act(() => view.result.current.editCode(SOLUCION));
    act(() => view.result.current.submit());
    await waitFor(() =>
      expect(view.result.current.state.answers).toHaveLength(4),
    );
    return view;
  };

  it('solo marca complete tras persistir y bloquea dos llamadas simultáneas', async () => {
    const completion = new FakeSessionCompletion();
    completion.defer();
    const view = await answerLastStep(new FakeExecution(), completion);

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
    expect(view.result.current.isCompleting).toBe(false);
    expect(completion.calls).toHaveLength(1);
  });

  it('expone el fallo, conserva answers y permite retry sin usar state.error', async () => {
    const completion = new FakeSessionCompletion();
    completion.failOnce('Cuota de almacenamiento agotada');
    const view = await answerLastStep(new FakeExecution(), completion);

    act(() => view.result.current.next());
    await waitFor(() =>
      expect(view.result.current.completionError).toBe(
        'Cuota de almacenamiento agotada',
      ),
    );

    expect(view.result.current.state.isComplete).toBe(false);
    expect(view.result.current.state.error).toBeNull();
    expect(view.result.current.state.answers).toHaveLength(4);

    act(() => view.result.current.retryCompletion());
    await waitFor(() => expect(view.result.current.state.isComplete).toBe(true));

    expect(completion.calls).toHaveLength(2);
    expect(completion.calls[1].operationId).toBe(
      completion.calls[0].operationId,
    );
    expect(view.result.current.completionError).toBeNull();
    expect(view.result.current.state.answers).toHaveLength(4);
  });
});
