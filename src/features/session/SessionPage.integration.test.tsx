import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AppProviders } from '@/app/providers';
import { WORKER_SCRIPT } from '@/lib/executor/worker-script';
import type {
  Attempt,
  CompletedSession,
  ConceptProgress,
} from '@/types/progress';
import SessionPage from './SessionPage';

interface WorkerScope {
  onmessage: ((event: { data: unknown }) => void) | null;
  postMessage: (data: unknown) => void;
}

/** Ejecuta el script real del Worker sin salir de jsdom. */
class FakeWorker {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  private readonly scope: WorkerScope;

  constructor(url: string) {
    void url;
    this.scope = {
      onmessage: null,
      postMessage: (data: unknown) => this.onmessage?.({ data } as MessageEvent),
    };

    // El código productivo nunca evalúa en el hilo de la UI. Esto reproduce el
    // ámbito aislado del Worker para probar el flujo completo en jsdom.
    new Function('self', WORKER_SCRIPT)(this.scope);
  }

  postMessage(data: unknown): void {
    try {
      this.scope.onmessage?.({ data });
    } catch (error) {
      this.onerror?.({
        message: error instanceof Error ? error.message : String(error),
      } as ErrorEvent);
    }
  }

  terminate(): void {}
}

const SOLUCION = 'function dobles(numeros) {\n  return numeros.map((n) => n * 2);\n}';
const SESSION_ID = 'js-arrays-map-vs-foreach-01';
const RECOVERY_KEY = 'codegym:session';
const PROGRESS_KEY = 'codegym:progress';
const ATTEMPTS_KEY = 'codegym:attempts';
const COMPLETED_SESSIONS_KEY = 'codegym:completed-sessions';

const ResultsDestination = () => <h1>Resultado de la sesión</h1>;

const renderIntegratedSession = () =>
  render(
    <AppProviders>
      <MemoryRouter initialEntries={['/practice/js-arrays-map-vs-foreach-01']}>
        <Routes>
          <Route path="/practice/:sessionId" element={<SessionPage />} />
          <Route path="/results/:sessionId" element={<ResultsDestination />} />
        </Routes>
      </MemoryRouter>
    </AppProviders>,
  );

const answerAndAdvance = async (option: string) => {
  fireEvent.click(screen.getByRole('radio', { name: option }));
  const comprobar = screen.getByRole('button', { name: 'Comprobar' });
  await waitFor(() => expect(comprobar).toBeEnabled());
  fireEvent.click(comprobar);
  const siguiente = screen.getByRole('button', { name: 'Siguiente paso' });
  await waitFor(() => expect(siguiente).toBeEnabled());
  fireEvent.click(siguiente);
};

function readStoredJson<T>(storage: Storage, key: string): T {
  const serialized = storage.getItem(key);

  if (serialized === null) {
    throw new Error(`No existen datos persistidos para ${key}`);
  }

  return JSON.parse(serialized) as T;
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  vi.stubGlobal('Worker', FakeWorker);
  class URLWithObjectUrl extends URL {
    static createObjectURL(blob: Blob): string {
      void blob;
      return 'blob:fix-code-flow';
    }

    static revokeObjectURL(url: string): void {
      void url;
    }
  }
  vi.stubGlobal('URL', URLWithObjectUrl);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('SessionPage · Fix Code integrado (T045.1)', () => {
  it('lleva una solución correcta de FixCodeStep hasta el Worker real y el feedback', async () => {
    renderIntegratedSession();

    await screen.findByRole('heading', { name: /forEach no devuelve/i });
    await answerAndAdvance('undefined');
    await answerAndAdvance("['ana', 'luis'] y después ['ANA', 'LUIS']");
    fireEvent.click(screen.getByRole('radio', { name: /^Línea 2\b/ }));
    fireEvent.click(
      screen.getByRole('radio', { name: 'Conceptual: se usa `forEach` donde hace falta `map`' }),
    );
    const comprobar = screen.getByRole('button', { name: 'Comprobar' });
    await waitFor(() => expect(comprobar).toBeEnabled());
    fireEvent.click(comprobar);
    const siguiente = screen.getByRole('button', { name: 'Siguiente paso' });
    await waitFor(() => expect(siguiente).toBeEnabled());
    fireEvent.click(siguiente);

    await screen.findByRole('button', { name: 'Usar editor de texto simple' });
    fireEvent.click(screen.getByRole('button', { name: 'Usar editor de texto simple' }));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: SOLUCION } });
    fireEvent.click(screen.getByRole('button', { name: 'Comprobar' }));

    await waitFor(() =>
      expect(screen.getByText('Respuesta correcta')).toBeInTheDocument(),
    );
  });
});

describe('SessionPage · persistencia integrada de sesión (T053)', () => {
  it('recupera una sesión y completa progress → attempts → completed session → cleanup', async () => {
    const originalSetItem = Storage.prototype.setItem;
    const originalRemoveItem = Storage.prototype.removeItem;
    const storageOperations: string[] = [];

    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (
      this: Storage,
      key,
      value,
    ) {
      storageOperations.push(`set:${key}`);
      originalSetItem.call(this, key, value);
    });
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(
      function (this: Storage, key) {
        storageOperations.push(`remove:${key}`);
        originalRemoveItem.call(this, key);
      },
    );

    const firstMount = renderIntegratedSession();

    await screen.findByRole('heading', { name: /forEach no devuelve/i });
    await answerAndAdvance('undefined');
    await waitFor(() => {
      const recovery = readStoredJson<{ currentStep: number; answers: unknown[] }>(
        sessionStorage,
        RECOVERY_KEY,
      );
      expect(recovery.currentStep).toBe(1);
      expect(recovery.answers).toHaveLength(1);
    });

    firstMount.unmount();
    renderIntegratedSession();

    await screen.findByRole('heading', { name: 'Tienes una sesión incompleta' });
    expect(sessionStorage.getItem(RECOVERY_KEY)).not.toBeNull();
    expect(localStorage.getItem(PROGRESS_KEY)).toBeNull();
    expect(localStorage.getItem(ATTEMPTS_KEY)).toBeNull();
    expect(localStorage.getItem(COMPLETED_SESSIONS_KEY)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    await screen.findByText('Paso 2 de 4');

    await answerAndAdvance("['ana', 'luis'] y después ['ANA', 'LUIS']");
    fireEvent.click(await screen.findByRole('radio', { name: /^Línea 2\b/ }));
    fireEvent.click(
      screen.getByRole('radio', {
        name: 'Conceptual: se usa `forEach` donde hace falta `map`',
      }),
    );
    const comprobarError = screen.getByRole('button', { name: 'Comprobar' });
    await waitFor(() => expect(comprobarError).toBeEnabled());
    fireEvent.click(comprobarError);
    const siguiente = screen.getByRole('button', { name: 'Siguiente paso' });
    await waitFor(() => expect(siguiente).toBeEnabled());
    fireEvent.click(siguiente);

    fireEvent.click(
      await screen.findByRole('button', { name: 'Usar editor de texto simple' }),
    );
    fireEvent.change(screen.getByRole('textbox'), { target: { value: SOLUCION } });
    fireEvent.click(screen.getByRole('button', { name: 'Comprobar' }));
    await waitFor(() =>
      expect(screen.getByText('Respuesta correcta')).toBeInTheDocument(),
    );
    await waitFor(() => {
      const recovery = readStoredJson<{ answers: unknown[] }>(
        sessionStorage,
        RECOVERY_KEY,
      );
      expect(recovery.answers).toHaveLength(4);
    });

    storageOperations.length = 0;
    fireEvent.click(screen.getByRole('button', { name: 'Terminar sesión' }));

    await screen.findByRole('heading', { name: '¡Sesión completada!' });
    fireEvent.click(screen.getByRole('link', { name: 'Ver resultados' }));
    await screen.findByRole('heading', { name: 'Resultado de la sesión' });
    await waitFor(() => expect(sessionStorage.getItem(RECOVERY_KEY)).toBeNull());

    const progressByConcept = readStoredJson<Record<string, ConceptProgress>>(
      localStorage,
      PROGRESS_KEY,
    );
    const attempts = readStoredJson<Attempt[]>(localStorage, ATTEMPTS_KEY);
    const completedSessions = readStoredJson<CompletedSession[]>(
      localStorage,
      COMPLETED_SESSIONS_KEY,
    );
    const progress = progressByConcept['js-array-iteration'];
    const completed = completedSessions[0];

    expect(progress).toMatchObject({
      conceptId: 'js-array-iteration',
      domain: 0,
      totalAttempts: 4,
      correctAttempts: 4,
      difficultyDistribution: {
        beginner: { total: 4, correct: 4 },
        intermediate: { total: 0, correct: 0 },
        advanced: { total: 0, correct: 0 },
      },
      recentErrors: [],
      schemaVersion: 1,
    });
    expect(attempts).toHaveLength(4);
    expect(attempts.map((attempt) => attempt.stepId)).toEqual([
      'step-1',
      'step-2',
      'step-3',
      'step-4',
    ]);
    expect(attempts.every((attempt) => attempt.sessionId === SESSION_ID)).toBe(true);
    expect(attempts.every((attempt) => attempt.isCorrect)).toBe(true);
    expect(new Set(attempts.map((attempt) => attempt.id)).size).toBe(4);
    expect(completedSessions).toHaveLength(1);
    expect(completed).toMatchObject({
      sessionId: SESSION_ID,
      technologyId: 'javascript',
      conceptId: 'js-array-iteration',
      totalSteps: 4,
      correctSteps: 4,
      accuracy: 100,
    });
    expect(completed?.timeSpentMs).toBe(
      attempts.reduce((total, attempt) => total + attempt.timeSpentMs, 0),
    );
    expect(progress?.lastPracticed).toBe(completed?.completedAt);
    expect(attempts.every((attempt) => attempt.createdAt === completed?.completedAt)).toBe(
      true,
    );
    expect(storageOperations).toEqual([
      `set:${PROGRESS_KEY}`,
      `set:${ATTEMPTS_KEY}`,
      `set:${ATTEMPTS_KEY}`,
      `set:${ATTEMPTS_KEY}`,
      `set:${ATTEMPTS_KEY}`,
      `set:${COMPLETED_SESSIONS_KEY}`,
      `remove:${RECOVERY_KEY}`,
    ]);
  });
});
