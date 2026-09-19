import { StrictMode, type ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { ContentProvider } from '@/contexts/ContentContext';
import { SessionRecoveryContext } from '@/contexts/session-recovery-context';
import { TrainingContext } from '@/contexts/training-context';
import { StaticContentRepository } from '@/lib/repositories/StaticContentRepository';
import type { SessionRecoverySnapshot } from '@/lib/recovery/ISessionRecoveryStore';
import { FakeSessionRecoveryStore } from '@/test/fake-session-recovery';
import { FakeTraining } from '@/test/fake-training';
import { useSession } from './useSession';

/**
 * Lo que este fichero cubre y SessionPage.test.tsx no puede: `hintsUsed` y
 * `executionError` viven dentro del estado del hook y la página no los expone
 * como tales.
 */

const repo = new StaticContentRepository();
const SESSION_ID = 'js-arrays-map-vs-foreach-01';

const montar = (
  _legacyExecution?: unknown,
  _legacyCompletion?: unknown,
  recovery: FakeSessionRecoveryStore = new FakeSessionRecoveryStore(),
  strict = false,
  training: FakeTraining = new FakeTraining(),
) => {
  const wrapper = ({ children }: { children: ReactNode }) => {
    const providers = (
      <SessionRecoveryContext.Provider value={recovery}>
        <TrainingContext.Provider value={training.value}>
          <ContentProvider repository={repo}>
            {children}
          </ContentProvider>
        </TrainingContext.Provider>
      </SessionRecoveryContext.Provider>
    );

    return strict
      ? <StrictMode>{providers}</StrictMode>
      : providers;
  };

  return renderHook(
    () => useSession(SESSION_ID),
    { wrapper },
  );
};

const loaded = async (
  _legacyExecution?: unknown,
  _legacyCompletion?: unknown,
  recovery?: FakeSessionRecoveryStore,
) => {
  const view = montar(
    undefined,
    undefined,
    recovery,
  );

  await waitFor(() =>
    expect(
      view.result.current.session,
    ).not.toBeNull(),
  );

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
    trainingRunId:
      'training-run-recovered-1',
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
    revealedHints: [],
    startTime: 1_000,
  };
};

/** Avanza los tres pasos de selección y deja el hook en el paso fix-code. */
const hastaFixCode = async (
  _legacyExecution?: unknown,
  _legacyCompletion?: unknown,
  recovery?: FakeSessionRecoveryStore,
  training?: FakeTraining,
) => {
  const view = montar(
    undefined,
    undefined,
    recovery,
    false,
    training,
  );

  await waitFor(() =>
    expect(
      view.result.current.session,
    ).not.toBeNull(),
  );

  act(() => view.result.current.select('b'));
  act(() => view.result.current.submit());

  await waitFor(() =>
    expect(
      view.result.current.state.answers,
    ).toHaveLength(1),
  );

  act(() => view.result.current.next());

  act(() => view.result.current.select('a'));
  act(() => view.result.current.submit());

  await waitFor(() =>
    expect(
      view.result.current.state.answers,
    ).toHaveLength(2),
  );

  act(() => view.result.current.next());

  act(() =>
    view.result.current.selectError({
      line: 2,
      errorType: 'conceptual',
    }),
  );

  act(() => view.result.current.submit());

  await waitFor(() =>
    expect(
      view.result.current.state.answers,
    ).toHaveLength(3),
  );

  act(() => view.result.current.next());

  await waitFor(() =>
    expect(
      view.result.current.currentStep?.type,
    ).toBe('fix-code'),
  );

  return view;
};

describe('useSession · TrainingRun (T229.6B.3)', () => {
  it('crea exactamente un TrainingRun para una sesión nueva', async () => {
    const training =
      new FakeTraining();

    const view = montar(
      undefined,
      undefined,
      undefined,
      false,
      training,
    );

    await waitFor(() =>
      expect(
        training.startCalls,
      ).toEqual([SESSION_ID]),
    );

    await waitFor(() =>
      expect(
        view.result.current.state.error,
      ).toBeNull(),
    );
  });

  it('StrictMode no crea dos TrainingRun para la misma sesión', async () => {
    const training =
      new FakeTraining();

    montar(
      undefined,
      undefined,
      undefined,
      true,
      training,
    );

    await waitFor(() =>
      expect(
        training.startCalls,
      ).toEqual([SESSION_ID]),
    );

    expect(
      training.startCalls,
    ).toHaveLength(1);
  });

  it('recovery con trainingRunId reutiliza el run y no crea otro', async () => {
    const recovery =
      new FakeSessionRecoveryStore();

    recovery.snapshot =
      await recoverableSnapshot();

    const training =
      new FakeTraining();

    const view = montar(
      undefined,
      undefined,
      recovery,
      false,
      training,
    );

    await waitFor(() =>
      expect(
        view.result.current.session,
      ).not.toBeNull(),
    );

    await waitFor(() =>
      expect(
        view.result.current.recoveryStatus,
      ).toBe('none'),
    );

    expect(
      training.startCalls,
    ).toHaveLength(0);
  });

  it('persiste trainingRunId en el recovery de una sesión nueva', async () => {
    const recovery =
      new FakeSessionRecoveryStore();

    const training =
      new FakeTraining();

    montar(
      undefined,
      undefined,
      recovery,
      false,
      training,
    );

    await waitFor(() =>
      expect(
        recovery.snapshot
          ?.trainingRunId,
      ).toBe(training.runId),
    );
  });
});

describe('useSession · autoridad backend (T229.6B.4)', () => {
  it('usa el veredicto del backend y no la corrección local del contenido', async () => {
    const training =
      new FakeTraining();

    training.answerIsCorrect = false;

    const view = montar(
      undefined,
      undefined,
      undefined,
      false,
      training,
    );

    await waitFor(() =>
      expect(
        training.startCalls,
      ).toEqual([SESSION_ID]),
    );

    // "b" es la respuesta que históricamente el fixture validaba
    // localmente como correcta. El servidor fuerza false.
    act(() => {
      view.result.current.select('b');
    });

    await waitFor(() =>
      expect(
        view.result.current.canSubmit,
      ).toBe(true),
    );

    act(() => {
      view.result.current.submit();
    });

    await waitFor(() =>
      expect(
        view.result.current.state.answers,
      ).toHaveLength(1),
    );

    expect(
      view.result.current.state.answers[0]
        .isCorrect,
    ).toBe(false);
  });

  it('envía únicamente el contrato público de respuesta al TrainingContext', async () => {
    const training =
      new FakeTraining();

    const view = montar(
      undefined,
      undefined,
      undefined,
      false,
      training,
    );

    await waitFor(() =>
      expect(
        training.startCalls,
      ).toEqual([SESSION_ID]),
    );

    const step =
      view.result.current.currentStep!;

    act(() => {
      view.result.current.revealHint();
    });

    await waitFor(() =>
      expect(
        view.result.current.state
          .revealedHints,
      ).toEqual([
        {
          index: 0,
          text: training.hintTexts[0],
        },
      ]),
    );

    act(() => {
      view.result.current.select('b');
    });

    await waitFor(() =>
      expect(
        view.result.current.canSubmit,
      ).toBe(true),
    );

    act(() => {
      view.result.current.submit();
    });

    await waitFor(() =>
      expect(
        training.submitCalls,
      ).toHaveLength(1),
    );

    expect(
      training.submitCalls[0].runId,
    ).toBe(training.runId);

    expect(
      training.submitCalls[0].input,
    ).toEqual({
      exerciseId: step.id,
      answer: 'b',
      durationMs:
        expect.any(Number),
    });

    expect(
      Object.keys(
        training.submitCalls[0].input,
      ).sort(),
    ).toEqual([
      'answer',
      'durationMs',
      'exerciseId',
    ]);
  });

  it('un fallo del backend no registra una respuesta local', async () => {
    const training =
      new FakeTraining();

    training.submitError =
      new Error(
        'Training API unavailable',
      );

    const view = montar(
      undefined,
      undefined,
      undefined,
      false,
      training,
    );

    await waitFor(() =>
      expect(
        training.startCalls,
      ).toEqual([SESSION_ID]),
    );

    act(() => {
      view.result.current.select('b');
    });

    await waitFor(() =>
      expect(
        view.result.current.canSubmit,
      ).toBe(true),
    );

    act(() => {
      view.result.current.submit();
    });

    await waitFor(() =>
      expect(
        view.result.current.executionError,
      ).toBe(
        'Training API unavailable',
      ),
    );

    expect(
      view.result.current.state.answers,
    ).toHaveLength(0);

    expect(
      view.result.current.state
        .isValidating,
    ).toBe(false);
  });
});

describe('useSession · pistas autoritativas', () => {
  it('does not reveal before the backend confirms and blocks concurrent clicks', async () => {
    const training = new FakeTraining();
    let resolveHint!: (value: { index: number; text: string; totalHints: number }) => void;
    const pending = new Promise<{ index: number; text: string; totalHints: number }>(
      (resolve) => { resolveHint = resolve; },
    );
    const reveal = vi.spyOn(training.value, 'revealHint').mockReturnValue(pending);
    const view = montar(undefined, undefined, undefined, false, training);
    await waitFor(() => expect(view.result.current.session).not.toBeNull());

    act(() => {
      view.result.current.revealHint();
      view.result.current.revealHint();
    });
    expect(view.result.current.state.revealedHints).toEqual([]);
    expect(view.result.current.isRevealingHint).toBe(true);

    await waitFor(() =>
      expect(reveal).toHaveBeenCalledTimes(1),
    );

    await act(async () => {
      resolveHint({ index: 0, text: 'Solo la autorizada', totalHints: 3 });
      await pending;
    });
    expect(view.result.current.state.revealedHints).toEqual([
      { index: 0, text: 'Solo la autorizada' },
    ]);
  });

  it('reveals one server-provided hint per click in order', async () => {
    const training = new FakeTraining();
    const view = montar(undefined, undefined, undefined, false, training);
    await waitFor(() => expect(view.result.current.session).not.toBeNull());

    act(() => view.result.current.revealHint());
    await waitFor(() => expect(view.result.current.state.revealedHints).toHaveLength(1));
    act(() => view.result.current.revealHint());
    await waitFor(() => expect(view.result.current.state.revealedHints).toHaveLength(2));

    expect(view.result.current.state.revealedHints).toEqual([
      { index: 0, text: training.hintTexts[0] },
      { index: 1, text: training.hintTexts[1] },
    ]);
    expect(training.revealCalls).toEqual([
      { runId: training.runId, exerciseId: view.result.current.currentStep!.id },
      { runId: training.runId, exerciseId: view.result.current.currentStep!.id },
    ]);
  });

  it('does not mutate local hint state when the backend rejects', async () => {
    const training = new FakeTraining();
    training.revealError = new Error('No se pudo revelar');
    const view = montar(undefined, undefined, undefined, false, training);
    await waitFor(() => expect(view.result.current.session).not.toBeNull());

    act(() => view.result.current.revealHint());
    await waitFor(() => expect(view.result.current.hintError).toBe('No se pudo revelar'));
    expect(view.result.current.state.revealedHints).toEqual([]);
  });

  it('submits no browser hint counter and trusts Attempt.hintsUsed', async () => {
    const training = new FakeTraining();
    const view = montar(undefined, undefined, undefined, false, training);
    await waitFor(() => expect(view.result.current.session).not.toBeNull());
    const step = view.result.current.currentStep!;

    act(() => view.result.current.revealHint());
    await waitFor(() => expect(view.result.current.state.revealedHints).toHaveLength(1));
    act(() => view.result.current.select(step.options![0].id));
    act(() => view.result.current.submit());
    await waitFor(() => expect(view.result.current.state.answers).toHaveLength(1));

    expect(training.submitCalls[0].input).toEqual({
      exerciseId: step.id,
      answer: step.options![0].id,
      durationMs: expect.any(Number),
    });
    expect(view.result.current.state.answers[0].hintsUsed).toBe(1);
  });

  it('clears only visual revealed hints when advancing', async () => {
    const training = new FakeTraining();
    const view = montar(undefined, undefined, undefined, false, training);
    await waitFor(() => expect(view.result.current.session).not.toBeNull());
    const first = view.result.current.currentStep!;

    act(() => view.result.current.revealHint());
    await waitFor(() => expect(view.result.current.state.revealedHints).toHaveLength(1));
    act(() => view.result.current.select(first.options![0].id));
    act(() => view.result.current.submit());
    await waitFor(() => expect(view.result.current.state.answers).toHaveLength(1));
    act(() => view.result.current.next());

    expect(view.result.current.state.revealedHints).toEqual([]);
    expect(view.result.current.state.answers[0].hintsUsed).toBe(1);
  });
});


describe('useSession · veredicto fix-code autoritativo', () => {
  it(
    'no muestra passed cuando la ejecución funcional pasa pero el backend rechaza el ejercicio',
    async () => {
      const training =
        new FakeTraining();

      const view =
        await hastaFixCode(
          undefined,
          undefined,
          undefined,
          training,
        );

      const originalSubmit =
        training.value.submitAnswer;

      training.value.submitAnswer =
        async (
          runId,
          input,
        ) => {
          const result =
            await originalSubmit(
              runId,
              input,
            );

          return {
            ...result,

            verification: {
              functionalCorrect:
                true,

              pedagogicalRequirementsMet:
                false,

              overallPassed:
                false,

              feedback: [
                'El resultado funcional es correcto, pero falta cumplir el objetivo pedagógico.',
              ],
            },

            attempt: {
              ...result.attempt,

              isCorrect:
                false,
            },

            execution: {
              passed:
                true,

              reason:
                'passed' as const,
            },
          };
        };

      act(() => {
        view.result.current.editCode(
          SOLUCION,
        );
      });

      await waitFor(() =>
        expect(
          view.result.current.canSubmit,
        ).toBe(true),
      );

      act(() => {
        view.result.current.submit();
      });

      await waitFor(() =>
        expect(
          view.result.current.executionStatus,
        ).toBe(
          'failed',
        ),
      );

      expect(
        view.result.current.state
          .answers.at(-1)?.isCorrect,
      ).toBe(
        false,
      );

      /*
       * Prueba explícita de la situación que causaba
       * la contradicción visual.
       */
      const lastCall =
        training.submitCalls.at(-1);

      expect(
        lastCall,
      ).toBeDefined();
    },
  );

  it(
    'muestra passed cuando el veredicto persistido del backend es correcto',
    async () => {
      const training =
        new FakeTraining();

      const view =
        await hastaFixCode(
          undefined,
          undefined,
          undefined,
          training,
        );

      act(() => {
        view.result.current.editCode(
          SOLUCION,
        );
      });

      await waitFor(() =>
        expect(
          view.result.current.canSubmit,
        ).toBe(true),
      );

      act(() => {
        view.result.current.submit();
      });

      await waitFor(() =>
        expect(
          view.result.current.executionStatus,
        ).toBe(
          'passed',
        ),
      );

      expect(
        view.result.current.state
          .answers.at(-1)?.isCorrect,
      ).toBe(
        true,
      );
    },
  );
});


describe('useSession · finalización autoritativa backend (T229.6B.5)', () => {
  it('completa la UI después de que la última respuesta haya sido confirmada por backend', async () => {
    const completion = { calls: [] as unknown[] };

    const training =
      new FakeTraining();

    const view = await hastaFixCode(
      undefined,
      completion,
      undefined,
      training,
    );

    act(() => {
      view.result.current.editCode(
        SOLUCION,
      );
    });

    act(() => {
      view.result.current.submit();
    });

    await waitFor(() =>
      expect(
        view.result.current.state.answers,
      ).toHaveLength(4),
    );

    expect(
      training.submitCalls,
    ).toHaveLength(4);

    // La persistencia antigua del frontend no participa.
    expect(
      completion.calls,
    ).toHaveLength(0);

    expect(
      view.result.current.state.isComplete,
    ).toBe(false);

    act(() => {
      view.result.current.next();
    });

    await waitFor(() =>
      expect(
        view.result.current.state.isComplete,
      ).toBe(true),
    );

    expect(
      completion.calls,
    ).toHaveLength(0);

    expect(
      view.result.current.completionError,
    ).toBeNull();
  });

  it('no completa si el backend no confirma completion en la última respuesta', async () => {
    const completion = { calls: [] as unknown[] };

    const training =
      new FakeTraining();

    const originalSubmit =
      training.value.submitAnswer;

    training.value.submitAnswer =
      async (runId, input) => {
        const result =
          await originalSubmit(
            runId,
            input,
          );

        return {
          ...result,
          completion: null,
        };
      };

    const view = await hastaFixCode(
      undefined,
      completion,
      undefined,
      training,
    );

    act(() => {
      view.result.current.editCode(
        SOLUCION,
      );
    });

    act(() => {
      view.result.current.submit();
    });

    await waitFor(() =>
      expect(
        view.result.current.state.answers,
      ).toHaveLength(4),
    );

    act(() => {
      view.result.current.next();
    });

    expect(
      view.result.current.state.isComplete,
    ).toBe(false);

    expect(
      view.result.current.completionError,
    ).toBe(
      'El backend no confirmó la finalización del TrainingRun',
    );

    expect(
      completion.calls,
    ).toHaveLength(0);
  });

  it('si falla el cleanup de recovery, la completion del backend no se revierte', async () => {
    const completion = { calls: [] as unknown[] };

    const recovery =
      new FakeSessionRecoveryStore();

    const training =
      new FakeTraining();

    const view = await hastaFixCode(
      undefined,
      completion,
      recovery,
      training,
    );

    act(() => {
      view.result.current.editCode(
        SOLUCION,
      );
    });

    act(() => {
      view.result.current.submit();
    });

    await waitFor(() =>
      expect(
        view.result.current.state.answers,
      ).toHaveLength(4),
    );

    recovery.clearError =
      'STORAGE_FULL';

    act(() => {
      view.result.current.next();
    });

    await waitFor(() =>
      expect(
        view.result.current.state.isComplete,
      ).toBe(true),
    );

    // El backend ya confirmó la completion.
    // Un fallo local de sessionStorage no puede revertirla.
    expect(
      training.submitCalls,
    ).toHaveLength(4);

    expect(
      completion.calls,
    ).toHaveLength(0);

    await waitFor(() =>
      expect(
        view.result.current.storageWarning,
      ).not.toBeNull(),
    );

    recovery.clearError = null;

    act(() => {
      view.result.current
        .retryRecoveryPersistence();
    });

    await waitFor(() =>
      expect(
        view.result.current.storageWarning,
      ).toBeNull(),
    );
  });
});

describe('useSession · sessionStorage recovery (T052)', () => {
  it('inspecciona antes de crear y persiste el estado inicial canónico', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(5_000);
    const recovery = new FakeSessionRecoveryStore();
    const view = await loaded(undefined, undefined, recovery);

    await waitFor(() =>
      expect(
        recovery.snapshot?.trainingRunId,
      ).toBe('training-run-test-1'),
    );

    expect(recovery.loadCalls).toBe(1);

    expect(recovery.saves[0]).toEqual({
      sessionId: SESSION_ID,
      currentStep: 0,
      answers: [],
      elapsedMs: 0,
      revealedHints: [],
      startTime: 5_000,
      lastActivityAt: 5_000,
    });
    expect(view.result.current.recoveryStatus).toBe('none');
  });

  it('restaura automáticamente un recovery válido de la misma sesión', async () => {
    const recovery = new FakeSessionRecoveryStore();
    recovery.snapshot = await recoverableSnapshot();
    const view = montar(undefined, undefined, recovery);

    await waitFor(() =>
      expect(view.result.current.session).not.toBeNull(),
    );
    await waitFor(() =>
      expect(view.result.current.recoveryStatus).toBe('none'),
    );

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

    await waitFor(() => expect(view.result.current.session).not.toBeNull());
    await waitFor(() =>
      expect(view.result.current.recoveryStatus).toBe('none'),
    );
    await waitFor(() => expect(recovery.saves.at(-1)?.elapsedMs).toBe(3_000));

    now = 12_500;

    act(() => {
      view.result.current.select('a');
    });

    act(() => {
      view.result.current.submit();
    });

    await waitFor(() =>
      expect(
        view.result.current.state.answers,
      ).toHaveLength(2),
    );

    await waitFor(() =>
      expect(
        recovery.saves.at(-1)?.elapsedMs,
      ).toBe(5_500),
    );

    expect(recovery.saves.at(-1)?.lastActivityAt).toBe(12_500);
    expect(view.result.current.state.startTime).toBe(1_000);
  });

  it('no incluye en elapsedMs el tiempo transcurrido con la sesión cerrada', async () => {
    let now = 50_000;
    vi.spyOn(Date, 'now').mockImplementation(() => now);
    const recovery = new FakeSessionRecoveryStore();
    recovery.snapshot = { ...(await recoverableSnapshot()), elapsedMs: 7_000 };
    const view = montar(undefined, undefined, recovery);

    await waitFor(() => expect(view.result.current.session).not.toBeNull());
    await waitFor(() =>
      expect(view.result.current.recoveryStatus).toBe('none'),
    );

    now = 51_200;

    act(() => {
      view.result.current.select('a');
    });

    act(() => {
      view.result.current.submit();
    });

    await waitFor(() =>
      expect(
        view.result.current.state.answers,
      ).toHaveLength(2),
    );

    await waitFor(() =>
      expect(
        recovery.saves.at(-1)?.elapsedMs,
      ).toBe(8_200),
    );
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

    await waitFor(() =>
      expect(
        recovery.snapshot?.trainingRunId,
      ).toBe('training-run-test-1'),
    );
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
      expect(view.result.current.state.revealedHints).toEqual([
        { index: 0, text: 'Pista autorizada 1' },
      ]),
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
      expect(view.result.current.state.revealedHints).toEqual([
        { index: 0, text: 'Pista autorizada 1' },
      ]),
    );
    expect(recovery.saves).toHaveLength(1);

    recovery.saveError = null;
    act(() => view.result.current.retryRecoveryPersistence());

    await waitFor(() => expect(view.result.current.storageWarning).toBeNull());
    expect(recovery.saves).toHaveLength(2);
    expect(recovery.snapshot?.revealedHints).toEqual([
      { index: 0, text: 'Pista autorizada 1' },
    ]);
  });

  it('unmount y remount reanudan automáticamente el recovery válido', async () => {
    const recovery = new FakeSessionRecoveryStore();
    const first = await loaded(undefined, undefined, recovery);
    await waitFor(() => expect(recovery.snapshot).not.toBeNull());

    first.unmount();
    expect(recovery.clearCalls).toBe(0);

    const second = montar(undefined, undefined, recovery);

    await waitFor(() =>
      expect(second.result.current.session).not.toBeNull(),
    );
    await waitFor(() =>
      expect(second.result.current.recoveryStatus).toBe('none'),
    );

    expect(second.result.current.state.sessionId).toBe(SESSION_ID);
    expect(recovery.snapshot).not.toBeNull();
    expect(recovery.clearCalls).toBe(0);
  });

  it('StrictMode inspecciona una vez y reanuda sin destruir el recovery', async () => {
    const recovery = new FakeSessionRecoveryStore();
    recovery.snapshot = await recoverableSnapshot();
    const view = montar(undefined, undefined, recovery, true);

    await waitFor(() =>
      expect(view.result.current.session).not.toBeNull(),
    );
    await waitFor(() =>
      expect(view.result.current.recoveryStatus).toBe('none'),
    );

    expect(recovery.loadCalls).toBe(1);
    expect(recovery.snapshot).not.toBeNull();
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
