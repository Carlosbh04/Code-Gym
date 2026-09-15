import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  ISessionRecoveryStore,
  SessionRecoverySnapshot,
} from './ISessionRecoveryStore';
import {
  SESSION_RECOVERY_KEY,
  SessionStorageRecoveryStore,
} from './SessionStorageRecoveryStore';

const SNAPSHOT: SessionRecoverySnapshot = {
  sessionId: 'session-a',
  currentStep: 1,
  answers: [
    {
      stepId: 'step-1',
      stepType: 'code-reading',
      answer: 'b',
      isCorrect: true,
      timeSpentMs: 2_500,
      hintsUsed: 1,
    },
  ],
  elapsedMs: 3_000,
  revealedHints: [
    { index: 0, text: 'Pista autorizada' },
  ],
  startTime: 1_000,
};

const storageDouble = (overrides: Partial<Storage>): Storage =>
  ({
    getItem: vi.fn(() => null),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    key: vi.fn(),
    length: 0,
    ...overrides,
  }) as Storage;

describe('SessionStorageRecoveryStore (T052)', () => {
  let store: ISessionRecoveryStore;

  beforeEach(() => {
    sessionStorage.clear();
    store = new SessionStorageRecoveryStore();
  });

  it('cumple el contrato sin exponer sessionStorage, Storage, clave ni JSON', () => {
    const source = readFileSync(
      'src/lib/recovery/ISessionRecoveryStore.ts',
      'utf8',
    );

    expect(store).toBeInstanceOf(SessionStorageRecoveryStore);
    expect(source).not.toMatch(
      /sessionStorage|localStorage|\bStorage\b|JSON\.(?:parse|stringify)/,
    );
  });

  it('useSession consume la abstracción y no Web Storage o JSON directamente', () => {
    const source = readFileSync('src/hooks/useSession.ts', 'utf8');

    expect(source).not.toMatch(
      /sessionStorage|localStorage|\bStorage\b|JSON\.(?:parse|stringify)/,
    );
  });

  it('devuelve null cuando no existe recovery', () => {
    expect(store.load()).toBeNull();
  });

  it('guarda y recupera únicamente el snapshot canónico', () => {
    store.save(SNAPSHOT);

    expect(JSON.parse(sessionStorage.getItem(SESSION_RECOVERY_KEY)!)).toEqual(
      SNAPSHOT,
    );
    expect(store.load()).toEqual(SNAPSHOT);
  });

  it('clear elimina únicamente el recovery de sesión', () => {
    store.save(SNAPSHOT);
    sessionStorage.setItem('otra-clave', 'conservar');

    store.clear();

    expect(sessionStorage.getItem(SESSION_RECOVERY_KEY)).toBeNull();
    expect(sessionStorage.getItem('otra-clave')).toBe('conservar');
  });

  it('clasifica JSON sintácticamente inválido sin borrarlo', () => {
    sessionStorage.setItem(SESSION_RECOVERY_KEY, '{roto');

    expect(() => store.load()).toThrowError(
      expect.objectContaining({ code: 'INVALID_JSON' }),
    );
    expect(sessionStorage.getItem(SESSION_RECOVERY_KEY)).toBe('{roto');
  });

  it.each([
    null,
    [],
    {},
    { ...SNAPSHOT, sessionId: '' },
    { ...SNAPSHOT, currentStep: -1 },
    { ...SNAPSHOT, answers: [] },
    { ...SNAPSHOT, elapsedMs: -1 },
    {
      ...SNAPSHOT,
      revealedHints: [
        { index: 0, text: 'Primera' },
        { index: 0, text: 'Duplicada' },
      ],
    },
    {
      ...SNAPSHOT,
      revealedHints: [
        { index: 1, text: 'Fuera de orden' },
      ],
    },
    {
      ...SNAPSHOT,
      revealedHints: [
        { index: 0, text: '' },
      ],
    },
    { ...SNAPSHOT, startTime: 'ayer' },
    { ...SNAPSHOT, lastActivityAt: 'ayer' },
    {
      ...SNAPSHOT,
      answers: [{ ...SNAPSHOT.answers[0], isCorrect: 'sí' }],
    },
  ])('clasifica una estructura no restaurable como RECOVERY_FAILED', (value) => {
    sessionStorage.setItem(SESSION_RECOVERY_KEY, JSON.stringify(value));

    expect(() => store.load()).toThrowError(
      expect.objectContaining({ code: 'RECOVERY_FAILED' }),
    );
    expect(sessionStorage.getItem(SESSION_RECOVERY_KEY)).not.toBeNull();
  });

  it('no restaura flags transitorios aunque estén presentes en el JSON', () => {
    sessionStorage.setItem(
      SESSION_RECOVERY_KEY,
      JSON.stringify({
        ...SNAPSHOT,
        isComplete: true,
        isValidating: true,
        error: 'inyectado',
      }),
    );

    expect(store.load()).toEqual(SNAPSHOT);
  });

  it('clasifica un fallo de lectura como STORAGE_UNAVAILABLE', () => {
    const unavailable = new SessionStorageRecoveryStore(
      storageDouble({
        getItem: vi.fn(() => {
          throw new Error('denegado');
        }),
      }),
    );

    expect(() => unavailable.load()).toThrowError(
      expect.objectContaining({ code: 'STORAGE_UNAVAILABLE' }),
    );
  });

  it('resuelve el global de forma perezosa y clasifica un getter bloqueado', () => {
    const original = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage');
    Object.defineProperty(globalThis, 'sessionStorage', {
      configurable: true,
      get: () => {
        throw new DOMException('bloqueado', 'SecurityError');
      },
    });

    try {
      const lazy = new SessionStorageRecoveryStore();
      expect(() => lazy.load()).toThrowError(
        expect.objectContaining({ code: 'STORAGE_UNAVAILABLE' }),
      );
    } finally {
      if (original !== undefined) {
        Object.defineProperty(globalThis, 'sessionStorage', original);
      }
    }
  });

  it('clasifica cuota agotada al escribir como STORAGE_FULL', () => {
    const full = new SessionStorageRecoveryStore(
      storageDouble({
        setItem: vi.fn(() => {
          throw new DOMException('lleno', 'QuotaExceededError');
        }),
      }),
    );

    expect(() => full.save(SNAPSHOT)).toThrowError(
      expect.objectContaining({ code: 'STORAGE_FULL' }),
    );
  });

  it('clasifica otros fallos de escritura y borrado como STORAGE_UNAVAILABLE', () => {
    const unavailableSave = new SessionStorageRecoveryStore(
      storageDouble({
        setItem: vi.fn(() => {
          throw new Error('bloqueado');
        }),
      }),
    );
    const unavailableClear = new SessionStorageRecoveryStore(
      storageDouble({
        removeItem: vi.fn(() => {
          throw new Error('bloqueado');
        }),
      }),
    );

    expect(() => unavailableSave.save(SNAPSHOT)).toThrowError(
      expect.objectContaining({ code: 'STORAGE_UNAVAILABLE' }),
    );
    expect(() => unavailableClear.clear()).toThrowError(
      expect.objectContaining({ code: 'STORAGE_UNAVAILABLE' }),
    );
  });

  it('un QuotaExceededError de lectura no autoriza sobrescritura y es STORAGE_UNAVAILABLE', () => {
    const unreadable = new SessionStorageRecoveryStore(
      storageDouble({
        getItem: vi.fn(() => {
          throw new DOMException('no se puede inspeccionar', 'QuotaExceededError');
        }),
      }),
    );

    expect(() => unreadable.load()).toThrowError(
      expect.objectContaining({ code: 'STORAGE_UNAVAILABLE' }),
    );
  });

  it('permite que otra instancia lea lo persistido', () => {
    store.save(SNAPSHOT);

    expect(new SessionStorageRecoveryStore().load()).toEqual(SNAPSHOT);
  });

  it('preserva lastActivityAt cuando existe y acepta snapshots legacy sin él', () => {
    const current = { ...SNAPSHOT, lastActivityAt: 9_000 };
    store.save(current);
    expect(store.load()).toEqual(current);

    sessionStorage.setItem(SESSION_RECOVERY_KEY, JSON.stringify(SNAPSHOT));
    expect(store.load()).toEqual(SNAPSHOT);
  });
});
