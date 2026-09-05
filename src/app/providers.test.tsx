import { StrictMode } from 'react';
import { describe, expect, it, afterEach, beforeEach, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { useCodeExecution } from '@/hooks/useCodeExecution';
import { useHistory } from '@/hooks/useHistory';
import { useProgress } from '@/hooks/useProgress';
import { useSessionCompletion } from '@/hooks/useSessionCompletion';
import { useSessionRecoveryStore } from '@/hooks/useSessionRecovery';
import { AppProviders } from './providers';

class FakeWorker {
  static instances: FakeWorker[] = [];

  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  terminated = false;

  constructor(url: string) {
    void url;
    FakeWorker.instances.push(this);
  }

  postMessage(message: unknown): void {
    void message;
  }

  terminate(): void {
    this.terminated = true;
  }
}

const revoked: string[] = [];

function Probe() {
  useCodeExecution();
  useHistory();
  useSessionCompletion();
  useSessionRecoveryStore();
  const { isLoading } = useProgress();
  return <p>{isLoading ? 'progress-loading' : 'providers-ready'}</p>;
}

describe('AppProviders · ciclo de vida de ejecución (T045.1)', () => {
  beforeEach(() => {
    FakeWorker.instances = [];
    revoked.length = 0;
    vi.stubGlobal('Worker', FakeWorker);
    class URLWithObjectUrl extends URL {
      static createObjectURL(blob: Blob): string {
        void blob;
        return `blob:provider/${FakeWorker.instances.length + 1}`;
      }

      static revokeObjectURL(url: string): void {
        revoked.push(url);
      }
    }
    vi.stubGlobal('URL', URLWithObjectUrl);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('destruye el executor al desmontar sin crear otro durante ese cleanup', async () => {
    const view = render(
      <StrictMode>
        <AppProviders>
          <Probe />
        </AppProviders>
      </StrictMode>,
    );

    await screen.findByText('providers-ready');

    // StrictMode comprueba el cleanup inicial: el primer executor se destruye
    // y el segundo es la única instancia viva que queda para la aplicación.
    expect(FakeWorker.instances).toHaveLength(2);
    expect(FakeWorker.instances[0].terminated).toBe(true);
    expect(FakeWorker.instances[1].terminated).toBe(false);

    const createdBeforeUnmount = FakeWorker.instances.length;
    view.unmount();

    expect(FakeWorker.instances).toHaveLength(createdBeforeUnmount);
    expect(FakeWorker.instances.every((worker) => worker.terminated)).toBe(true);
    expect(revoked).toHaveLength(createdBeforeUnmount);
  });
});
