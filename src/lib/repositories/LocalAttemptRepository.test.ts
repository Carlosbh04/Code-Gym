import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Attempt } from '@/types/progress';
import type { IAttemptRepository } from '@/types/repository';
import { LocalAttemptRepository } from './LocalAttemptRepository';

const STORAGE_KEY = 'codegym:attempts';

const attemptOf = (
  id: string,
  sessionId: string,
  createdAt: string,
): Attempt => ({
  id,
  sessionId,
  stepId: `step-${id}`,
  stepType: 'code-reading',
  answer: 'a',
  isCorrect: true,
  timeSpentMs: 1200,
  hintsUsed: 0,
  createdAt,
});

const FIRST = attemptOf('1', 'session-a', '2026-09-01T10:00:00.000Z');
const SECOND = attemptOf('2', 'session-b', '2026-09-03T10:00:00.000Z');
const THIRD = attemptOf('3', 'session-a', '2026-09-02T10:00:00.000Z');

describe('LocalAttemptRepository (T047)', () => {
  let repo: IAttemptRepository;

  beforeEach(() => {
    localStorage.clear();
    repo = new LocalAttemptRepository();
  });

  describe('contrato y ausencia de datos', () => {
    it('cumple IAttemptRepository y todas sus operaciones son asíncronas', async () => {
      expect(repo).toBeInstanceOf(LocalAttemptRepository);
      await expect(repo.getAttemptsBySession('session-a')).resolves.toEqual([]);
      await expect(repo.getRecentAttempts(10)).resolves.toEqual([]);
      await expect(repo.clearAttempts()).resolves.toBeUndefined();
    });

    it('devuelve listas vacías cuando no existe historial persistido', async () => {
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
      await expect(repo.getAttemptsBySession('session-a')).resolves.toEqual([]);
      await expect(repo.getRecentAttempts(3)).resolves.toEqual([]);
    });

    it('el contrato público no expone Storage, claves ni JSON', () => {
      const source = readFileSync(
        'src/lib/repositories/IAttemptRepository.ts',
        'utf8',
      );

      expect(source).not.toMatch(/localStorage|sessionStorage|\bStorage\b|JSON/);
    });
  });

  describe('escritura y consultas', () => {
    it('añade un intento y conserva todos sus campos', async () => {
      await repo.saveAttempt(FIRST);

      expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual([FIRST]);
      await expect(repo.getAttemptsBySession(FIRST.sessionId)).resolves.toEqual([FIRST]);
    });

    it('acumula múltiples intentos sin reemplazar eventos anteriores', async () => {
      await repo.saveAttempt(FIRST);
      await repo.saveAttempt(SECOND);
      await repo.saveAttempt(THIRD);

      expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual([
        FIRST,
        SECOND,
        THIRD,
      ]);
    });

    it('filtra por sesión y conserva el orden persistido', async () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([FIRST, SECOND, THIRD]));

      await expect(repo.getAttemptsBySession('session-a')).resolves.toEqual([
        FIRST,
        THIRD,
      ]);
      await expect(repo.getAttemptsBySession('no-existe')).resolves.toEqual([]);
    });

    it('devuelve los intentos más recientes por createdAt y respeta el límite', async () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([FIRST, SECOND, THIRD]));

      await expect(repo.getRecentAttempts(2)).resolves.toEqual([SECOND, THIRD]);
      await expect(repo.getRecentAttempts(10)).resolves.toEqual([
        SECOND,
        THIRD,
        FIRST,
      ]);
      await expect(repo.getRecentAttempts(0)).resolves.toEqual([]);
      await expect(repo.getRecentAttempts(-1)).resolves.toEqual([]);
    });

    it('clearAttempts elimina solo el historial de intentos', async () => {
      await repo.saveAttempt(FIRST);
      localStorage.setItem('codegym:progress', '{}');

      await repo.clearAttempts();

      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
      expect(localStorage.getItem('codegym:progress')).toBe('{}');
    });

    it('dos instancias comparten los datos persistidos sin estado privado divergente', async () => {
      const writer = new LocalAttemptRepository();
      const reader = new LocalAttemptRepository();

      await writer.saveAttempt(FIRST);
      await expect(reader.getRecentAttempts(1)).resolves.toEqual([FIRST]);

      await reader.saveAttempt(SECOND);
      await expect(writer.getRecentAttempts(2)).resolves.toEqual([SECOND, FIRST]);
    });
  });

  describe('datos corruptos y fallos reales de Storage', () => {
    it.each(['{no es JSON', 'null', '{}', '"texto"'])(
      'trata la raíz %j como historial vacío sin lanzar',
      async (corrupto) => {
        localStorage.setItem(STORAGE_KEY, corrupto);

        await expect(repo.getAttemptsBySession('session-a')).resolves.toEqual([]);
        await expect(repo.getRecentAttempts(5)).resolves.toEqual([]);
      },
    );

    it('una escritura posterior sustituye datos corruptos', async () => {
      localStorage.setItem(STORAGE_KEY, '{no es JSON');

      await repo.saveAttempt(FIRST);

      expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual([FIRST]);
      await expect(repo.getRecentAttempts(1)).resolves.toEqual([FIRST]);
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
      const unavailable = new LocalAttemptRepository(storage);

      await expect(unavailable.getRecentAttempts(1)).rejects.toThrow(
        'Storage no disponible',
      );
      readable = true;
      await expect(unavailable.saveAttempt(FIRST)).rejects.toThrow('Cuota agotada');
      await expect(unavailable.clearAttempts()).rejects.toThrow('No se pudo borrar');
    });
  });
});
