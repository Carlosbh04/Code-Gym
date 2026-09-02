import { readFileSync } from 'node:fs';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ConceptProgress } from '@/types/progress';
import type { IProgressRepository } from '@/types/repository';
import { useProgress } from '@/hooks/useProgress';
import { ProgressProvider } from './ProgressContext';

const progressOf = (conceptId: string, domain: number): ConceptProgress => ({
  conceptId,
  domain,
  totalAttempts: 8,
  correctAttempts: 6,
  difficultyDistribution: {
    beginner: { total: 4, correct: 3 },
    intermediate: { total: 3, correct: 2 },
    advanced: { total: 1, correct: 1 },
  },
  recentErrors: [],
  lastPracticed: '2026-09-02T10:00:00.000Z',
  schemaVersion: 1,
});

class FakeProgressRepository implements IProgressRepository {
  getAllCalls = 0;
  updates: Array<{ conceptId: string; progress: ConceptProgress }> = [];
  loadError: Error | null = null;
  updateError: Error | null = null;

  constructor(private stored: ConceptProgress[] = []) {}

  async getConceptProgress(conceptId: string): Promise<ConceptProgress | null> {
    return this.stored.find((item) => item.conceptId === conceptId) ?? null;
  }

  async getAllProgress(): Promise<ConceptProgress[]> {
    this.getAllCalls += 1;
    if (this.loadError !== null) throw this.loadError;
    return this.stored;
  }

  async updateProgress(
    conceptId: string,
    progress: ConceptProgress,
  ): Promise<void> {
    if (this.updateError !== null) throw this.updateError;
    this.updates.push({ conceptId, progress });
    this.stored = [
      ...this.stored.filter((item) => item.conceptId !== conceptId),
      progress,
    ];
  }

  async clearProgress(): Promise<void> {
    this.stored = [];
  }
}

const mount = (repository: IProgressRepository) => {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <ProgressProvider repository={repository}>{children}</ProgressProvider>
  );
  return renderHook(() => useProgress(), { wrapper });
};

describe('ProgressProvider + useProgress (T049)', () => {
  it('useProgress falla claramente fuera de ProgressProvider', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => renderHook(() => useProgress())).toThrow(
      'useProgress debe usarse dentro de <ProgressProvider>',
    );

    consoleError.mockRestore();
  });

  it('expone el contexto tipado y pasa de loading a progreso cargado', async () => {
    const arrays = progressOf('js-array-iteration', 42);
    const functions = progressOf('js-function-basics', 77);
    const view = mount(new FakeProgressRepository([arrays, functions]));

    expect(view.result.current.isLoading).toBe(true);
    await waitFor(() => expect(view.result.current.isLoading).toBe(false));

    expect([...view.result.current.progress.entries()]).toEqual([
      [arrays.conceptId, arrays],
      [functions.conceptId, functions],
    ]);
    expect(view.result.current.error).toBeNull();
  });

  it('representa ausencia persistida como mapa vacío sin error', async () => {
    const view = mount(new FakeProgressRepository());

    await waitFor(() => expect(view.result.current.isLoading).toBe(false));

    expect(view.result.current.progress.size).toBe(0);
    expect(view.result.current.error).toBeNull();
    expect(view.result.current.getConceptDomain('no-existe')).toBe(0);
  });

  it('representa un error del repositorio sin desmontar al consumidor', async () => {
    const repository = new FakeProgressRepository();
    repository.loadError = new Error('Storage no disponible');
    const view = mount(repository);

    await waitFor(() => expect(view.result.current.isLoading).toBe(false));

    expect(view.result.current.progress.size).toBe(0);
    expect(view.result.current.error).toBe('Storage no disponible');
    expect(view.result.current).toHaveProperty('getConceptDomain');
  });

  it('getConceptDomain devuelve el dominio cargado sin consultar de nuevo', async () => {
    const repository = new FakeProgressRepository([
      progressOf('js-array-iteration', 64),
    ]);
    const view = mount(repository);
    await waitFor(() => expect(view.result.current.isLoading).toBe(false));

    expect(view.result.current.getConceptDomain('js-array-iteration')).toBe(64);
    expect(repository.getAllCalls).toBe(1);
  });

  it('updateProgress fusiona un parcial, persiste primero y actualiza el mapa', async () => {
    const original = progressOf('js-array-iteration', 42);
    const repository = new FakeProgressRepository([original]);
    const view = mount(repository);
    await waitFor(() => expect(view.result.current.isLoading).toBe(false));

    await act(() =>
      view.result.current.updateProgress(original.conceptId, {
        domain: 70,
        totalAttempts: 9,
      }),
    );

    expect(repository.updates).toEqual([
      {
        conceptId: original.conceptId,
        progress: { ...original, domain: 70, totalAttempts: 9 },
      },
    ]);
    expect(view.result.current.getConceptDomain(original.conceptId)).toBe(70);
    expect(view.result.current.error).toBeNull();
  });

  it('un fallo de actualización conserva el estado, expone error y rechaza', async () => {
    const original = progressOf('js-array-iteration', 42);
    const repository = new FakeProgressRepository([original]);
    repository.updateError = new Error('Cuota agotada');
    const view = mount(repository);
    await waitFor(() => expect(view.result.current.isLoading).toBe(false));

    let rejection: unknown;
    await act(async () => {
      try {
        await view.result.current.updateProgress(original.conceptId, {
          domain: 90,
        });
      } catch (reason: unknown) {
        rejection = reason;
      }
    });

    expect(rejection).toEqual(new Error('Cuota agotada'));
    expect(view.result.current.getConceptDomain(original.conceptId)).toBe(42);
    expect(view.result.current.error).toBe('Cuota agotada');
  });

  it('no inventa progreso incompleto para un concepto ausente', async () => {
    const repository = new FakeProgressRepository();
    const view = mount(repository);
    await waitFor(() => expect(view.result.current.isLoading).toBe(false));

    await expect(
      act(() => view.result.current.updateProgress('nuevo', { domain: 10 })),
    ).rejects.toThrow('No existe progreso para el concepto nuevo');
    expect(repository.updates).toEqual([]);
    expect(view.result.current.progress.size).toBe(0);
  });

  it('no recarga el repositorio al rerenderizar con la misma dependencia', async () => {
    const repository = new FakeProgressRepository([
      progressOf('js-array-iteration', 42),
    ]);
    const view = mount(repository);
    await waitFor(() => expect(view.result.current.isLoading).toBe(false));

    view.rerender();
    view.rerender();

    expect(repository.getAllCalls).toBe(1);
  });

  it('contexto y hook no contienen acceso directo a almacenamiento', () => {
    for (const path of [
      'src/contexts/progress-context.ts',
      'src/contexts/ProgressContext.tsx',
      'src/hooks/useProgress.ts',
    ]) {
      const source = readFileSync(path, 'utf8');
      const executableSource = source
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/^\s*\/\/.*$/gm, '');

      expect(executableSource, path).not.toMatch(
        /localStorage|sessionStorage|JSON\.(?:parse|stringify)/,
      );
    }
  });
});
