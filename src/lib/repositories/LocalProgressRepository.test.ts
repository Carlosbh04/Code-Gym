import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ConceptProgress } from '@/types/progress';
import type { IProgressRepository } from '@/types/repository';
import { LocalProgressRepository, PROGRESS_STORAGE_KEY } from './LocalProgressRepository';

const progressOf = (conceptId: string, domain = 42): ConceptProgress => ({
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

describe('LocalProgressRepository (T046)', () => {
  let repo: IProgressRepository;

  beforeEach(() => {
    localStorage.clear();
    repo = new LocalProgressRepository();
  });

  describe('contrato y datos inexistentes', () => {
    it('cumple IProgressRepository y todas sus operaciones son asíncronas', async () => {
      expect(repo).toBeInstanceOf(LocalProgressRepository);
      await expect(repo.getConceptProgress('no-existe')).resolves.toBeNull();
      await expect(repo.getAllProgress()).resolves.toEqual([]);
      await expect(repo.clearProgress()).resolves.toBeUndefined();
    });

    it('devuelve null y una lista vacía cuando no existe la clave', async () => {
      expect(localStorage.getItem(PROGRESS_STORAGE_KEY)).toBeNull();
      await expect(repo.getConceptProgress('js-array-iteration')).resolves.toBeNull();
      await expect(repo.getAllProgress()).resolves.toEqual([]);
    });
  });

  describe('lectura y escritura', () => {
    it('guarda el progreso bajo la clave y lo recupera por conceptId', async () => {
      const progress = progressOf('js-array-iteration');

      await repo.updateProgress(progress.conceptId, progress);

      expect(JSON.parse(localStorage.getItem(PROGRESS_STORAGE_KEY)!)).toEqual({
        'js-array-iteration': progress,
      });
      await expect(repo.getConceptProgress('js-array-iteration')).resolves.toEqual(progress);
    });

    it('conserva otros conceptos al actualizar uno y devuelve todos los progresos', async () => {
      const arrays = progressOf('js-array-iteration', 42);
      const functions = progressOf('js-function-basics', 77);

      await repo.updateProgress(arrays.conceptId, arrays);
      await repo.updateProgress(functions.conceptId, functions);

      await expect(repo.getAllProgress()).resolves.toEqual([arrays, functions]);
      await expect(repo.getConceptProgress(arrays.conceptId)).resolves.toEqual(arrays);
    });

    it('sustituye solo el valor del conceptId actualizado', async () => {
      const previous = progressOf('js-array-iteration', 42);
      const updated = progressOf('js-array-iteration', 64);

      await repo.updateProgress(previous.conceptId, previous);
      await repo.updateProgress(updated.conceptId, updated);

      await expect(repo.getAllProgress()).resolves.toEqual([updated]);
    });

    it('clearProgress elimina exclusivamente el progreso persistido', async () => {
      await repo.updateProgress('js-array-iteration', progressOf('js-array-iteration'));
      localStorage.setItem('codegym:attempts', '[]');

      await repo.clearProgress();

      expect(localStorage.getItem(PROGRESS_STORAGE_KEY)).toBeNull();
      expect(localStorage.getItem('codegym:attempts')).toBe('[]');
    });
  });

  describe('datos corruptos y errores de Storage', () => {
    it.each(['{no es JSON', 'null', '[]'])(
      'trata %j como progreso vacío sin lanzar',
      async (corrupto) => {
        localStorage.setItem(PROGRESS_STORAGE_KEY, corrupto);

        await expect(repo.getConceptProgress('js-array-iteration')).resolves.toBeNull();
        await expect(repo.getAllProgress()).resolves.toEqual([]);
      },
    );

    it('sobrescribe datos corruptos en la siguiente escritura', async () => {
      const progress = progressOf('js-array-iteration');
      localStorage.setItem(PROGRESS_STORAGE_KEY, '{no es JSON');

      await repo.updateProgress(progress.conceptId, progress);

      await expect(repo.getAllProgress()).resolves.toEqual([progress]);
    });

    it('propaga fallos de lectura y escritura de Storage', async () => {
      let readable = false;
      const getItem = vi.fn((key: string): string | null => {
        void key;
        if (!readable) {
          throw new Error('Storage no disponible');
        }
        return null;
      });
      const setItem = vi.fn((key: string, value: string): void => {
        void key;
        void value;
        throw new Error('Cuota agotada');
      });
      const storage = {
        getItem,
        setItem,
        removeItem: vi.fn(),
        key: vi.fn(),
        clear: vi.fn(),
        length: 0,
      } as unknown as Storage;
      const unavailable = new LocalProgressRepository(storage);

      await expect(unavailable.getAllProgress()).rejects.toThrow('Storage no disponible');
      readable = true;
      await expect(
        unavailable.updateProgress('js-array-iteration', progressOf('js-array-iteration')),
      ).rejects.toThrow('Cuota agotada');
    });
  });
});
