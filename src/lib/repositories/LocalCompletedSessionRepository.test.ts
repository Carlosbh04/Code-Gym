import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CompletedSession } from '@/types/progress';
import type { ICompletedSessionRepository } from '@/types/repository';
import { LocalCompletedSessionRepository } from './LocalCompletedSessionRepository';

const STORAGE_KEY = 'codegym:completed-sessions';

const completedOf = (
  id: string,
  sessionId: string,
  completedAt: string,
  accuracy = 75,
): CompletedSession => ({
  id,
  sessionId,
  technologyId: 'javascript',
  conceptId: 'js-array-iteration',
  totalSteps: 4,
  correctSteps: 3,
  accuracy,
  timeSpentMs: 12_000,
  completedAt,
});

const FIRST = completedOf('completion-1', 'session-a', '2026-09-01T10:00:00.000Z');
const SECOND = completedOf('completion-2', 'session-b', '2026-09-03T10:00:00.000Z');
const THIRD = completedOf('completion-3', 'session-c', '2026-09-02T10:00:00.000Z');

describe('LocalCompletedSessionRepository (T048)', () => {
  let repo: ICompletedSessionRepository;

  beforeEach(() => {
    localStorage.clear();
    repo = new LocalCompletedSessionRepository();
  });

  describe('contrato y ausencia de datos', () => {
    it('cumple el contrato canónico y sus operaciones son asíncronas', async () => {
      expect(repo).toBeInstanceOf(LocalCompletedSessionRepository);
      await expect(repo.getBySessionId('session-a')).resolves.toBeNull();
      await expect(repo.getRecent(10)).resolves.toEqual([]);
      await expect(repo.clear()).resolves.toBeUndefined();
    });

    it('devuelve null y lista vacía cuando no existe la clave', async () => {
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
      await expect(repo.getBySessionId('session-a')).resolves.toBeNull();
      await expect(repo.getRecent(3)).resolves.toEqual([]);
    });

    it('el reexport público no expone detalles de almacenamiento', () => {
      const source = readFileSync(
        'src/lib/repositories/ICompletedSessionRepository.ts',
        'utf8',
      );

      expect(source).not.toMatch(/localStorage|sessionStorage|\bStorage\b|JSON/);
    });
  });

  describe('save y consulta por sesión', () => {
    it('guarda una sesión completa conservando todos sus campos', async () => {
      await repo.save(FIRST);

      expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual([FIRST]);
      await expect(repo.getBySessionId(FIRST.sessionId)).resolves.toEqual(FIRST);
    });

    it('devuelve null para un sessionId inexistente', async () => {
      await repo.save(FIRST);

      await expect(repo.getBySessionId('no-existe')).resolves.toBeNull();
    });

    it('conserva sesiones con sessionId distintos', async () => {
      await repo.save(FIRST);
      await repo.save(SECOND);
      await repo.save(THIRD);

      await expect(repo.getBySessionId('session-a')).resolves.toEqual(FIRST);
      await expect(repo.getBySessionId('session-b')).resolves.toEqual(SECOND);
      await expect(repo.getBySessionId('session-c')).resolves.toEqual(THIRD);
    });

    it('reemplaza la metadata anterior del mismo sessionId', async () => {
      const updated = completedOf(
        'completion-new',
        FIRST.sessionId,
        '2026-09-04T10:00:00.000Z',
        100,
      );

      await repo.save(FIRST);
      await repo.save(SECOND);
      await repo.save(updated);

      await expect(repo.getBySessionId(FIRST.sessionId)).resolves.toEqual(updated);
      expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual([SECOND, updated]);
    });

    it('el reemplazo elimina duplicados previos del mismo sessionId', async () => {
      const duplicate = completedOf(
        'completion-duplicate',
        FIRST.sessionId,
        '2026-09-02T12:00:00.000Z',
      );
      const updated = completedOf(
        'completion-current',
        FIRST.sessionId,
        '2026-09-04T10:00:00.000Z',
      );
      localStorage.setItem(STORAGE_KEY, JSON.stringify([FIRST, duplicate, SECOND]));

      await repo.save(updated);

      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!) as CompletedSession[];
      expect(stored.filter((session) => session.sessionId === FIRST.sessionId)).toEqual([
        updated,
      ]);
      expect(stored).toHaveLength(2);
    });
  });

  describe('sesiones recientes y limpieza', () => {
    it('ordena por completedAt descendente, independientemente del orden guardado', async () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([FIRST, SECOND, THIRD]));

      await expect(repo.getRecent(10)).resolves.toEqual([SECOND, THIRD, FIRST]);
    });

    it('respeta el límite y trata límites no positivos como lista vacía', async () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([FIRST, SECOND, THIRD]));

      await expect(repo.getRecent(2)).resolves.toEqual([SECOND, THIRD]);
      await expect(repo.getRecent(1)).resolves.toEqual([SECOND]);
      await expect(repo.getRecent(0)).resolves.toEqual([]);
      await expect(repo.getRecent(-1)).resolves.toEqual([]);
    });

    it('clear elimina solo las sesiones completadas', async () => {
      await repo.save(FIRST);
      localStorage.setItem('codegym:attempts', '[]');

      await repo.clear();

      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
      expect(localStorage.getItem('codegym:attempts')).toBe('[]');
    });

    it('distintas instancias comparten el estado persistido', async () => {
      const writer = new LocalCompletedSessionRepository();
      const reader = new LocalCompletedSessionRepository();

      await writer.save(FIRST);
      await expect(reader.getBySessionId(FIRST.sessionId)).resolves.toEqual(FIRST);

      await reader.save(SECOND);
      await expect(writer.getRecent(2)).resolves.toEqual([SECOND, FIRST]);
    });
  });

  describe('datos corruptos y errores reales de Storage', () => {
    it.each(['{no es JSON', 'null', '{}', '"texto"'])(
      'trata la raíz %j como colección vacía',
      async (corrupto) => {
        localStorage.setItem(STORAGE_KEY, corrupto);

        await expect(repo.getBySessionId('session-a')).resolves.toBeNull();
        await expect(repo.getRecent(5)).resolves.toEqual([]);
      },
    );

    it('una escritura válida posterior sustituye datos corruptos', async () => {
      localStorage.setItem(STORAGE_KEY, '{no es JSON');

      await repo.save(FIRST);

      expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual([FIRST]);
      await expect(repo.getBySessionId(FIRST.sessionId)).resolves.toEqual(FIRST);
    });

    it('propaga errores reales de lectura, escritura y borrado', async () => {
      let readable = false;
      const getItem = vi.fn((key: string): string | null => {
        void key;
        if (!readable) throw new Error('Storage no disponible');
        return null;
      });
      const setItem = vi.fn((key: string, value: string): void => {
        void key;
        void value;
        throw new Error('Cuota agotada');
      });
      const removeItem = vi.fn((key: string): void => {
        void key;
        throw new Error('No se pudo borrar');
      });
      const storage = {
        getItem,
        setItem,
        removeItem,
        key: vi.fn(),
        clear: vi.fn(),
        length: 0,
      } as unknown as Storage;
      const unavailable = new LocalCompletedSessionRepository(storage);

      await expect(unavailable.getRecent(1)).rejects.toThrow('Storage no disponible');
      readable = true;
      await expect(unavailable.save(FIRST)).rejects.toThrow('Cuota agotada');
      await expect(unavailable.clear()).rejects.toThrow('No se pudo borrar');
    });
  });
});
