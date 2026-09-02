import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AppProviders } from '@/app/providers';
import { WORKER_SCRIPT } from '@/lib/executor/worker-script';
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

const renderIntegratedSession = () =>
  render(
    <AppProviders>
      <MemoryRouter initialEntries={['/practice/js-arrays-map-vs-foreach-01']}>
        <Routes>
          <Route path="/practice/:sessionId" element={<SessionPage />} />
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

describe('SessionPage · Fix Code integrado (T045.1)', () => {
  beforeEach(() => {
    vi.stubGlobal('Worker', FakeWorker);
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: (blob: Blob) => {
        void blob;
        return 'blob:fix-code-flow';
      },
      revokeObjectURL: (url: string) => {
        void url;
      },
    });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

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
