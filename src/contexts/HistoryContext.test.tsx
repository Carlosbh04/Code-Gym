import { StrictMode, type ReactNode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useHistory } from '@/hooks/useHistory';
import type { Attempt, CompletedSession } from '@/types/progress';
import type {
  IAttemptRepository,
  ICompletedSessionRepository,
} from '@/types/repository';
import { HistoryProvider } from './HistoryContext';

const COMPLETED: CompletedSession = {
  id: 'completion-1',
  sessionId: 'session-1',
  technologyId: 'javascript',
  conceptId: 'concept-1',
  totalSteps: 4,
  correctSteps: 3,
  accuracy: 75,
  timeSpentMs: 12_000,
  completedAt: '2026-09-02T10:00:00.000Z',
};

const ATTEMPT: Attempt = {
  id: 'attempt-1',
  sessionId: 'session-1',
  stepId: 'step-1',
  stepType: 'code-reading',
  answer: 'a',
  isCorrect: true,
  timeSpentMs: 1_000,
  hintsUsed: 0,
  createdAt: '2026-09-02T10:00:00.000Z',
};

function repositories({
  completed = [COMPLETED],
  completedError,
  attempts = [ATTEMPT],
  attemptsError,
}: {
  completed?: CompletedSession[];
  completedError?: Error;
  attempts?: Attempt[];
  attemptsError?: Error;
} = {}) {
  const attemptRepository: IAttemptRepository = {
    saveAttempt: vi.fn(),
    getAttemptsBySession: vi.fn(async () => {
      if (attemptsError) throw attemptsError;
      return attempts;
    }),
    getRecentAttempts: vi.fn(),
    clearAttempts: vi.fn(),
  };
  const completedSessionRepository: ICompletedSessionRepository = {
    save: vi.fn(),
    getBySessionId: vi.fn(),
    getRecent: vi.fn(async () => {
      if (completedError) throw completedError;
      return completed;
    }),
    clear: vi.fn(),
  };

  return { attemptRepository, completedSessionRepository };
}

function wrapperFor(
  repos: ReturnType<typeof repositories>,
  strict = false,
) {
  return function Wrapper({ children }: { children: ReactNode }) {
    const provider = (
      <HistoryProvider
        attemptRepository={repos.attemptRepository}
        completedSessionRepository={repos.completedSessionRepository}
      >
        {children}
      </HistoryProvider>
    );
    return strict ? <StrictMode>{provider}</StrictMode> : provider;
  };
}

describe('HistoryContext + useHistory (T055)', () => {
  it('empieza cargando y expone las cinco sesiones recientes solicitadas', async () => {
    const repos = repositories();
    const { result } = renderHook(() => useHistory(), {
      wrapper: wrapperFor(repos),
    });

    expect(result.current.completedSessionsLoading).toBe(true);
    await waitFor(() => expect(result.current.completedSessionsLoading).toBe(false));
    expect(result.current.recentCompletedSessions).toEqual([COMPLETED]);
    expect(repos.completedSessionRepository.getRecent).toHaveBeenCalledWith(5);
  });

  it('representa un historial vacío sin error', async () => {
    const repos = repositories({ completed: [] });
    const { result } = renderHook(() => useHistory(), {
      wrapper: wrapperFor(repos),
    });

    await waitFor(() => expect(result.current.completedSessionsLoading).toBe(false));
    expect(result.current.recentCompletedSessions).toEqual([]);
    expect(result.current.completedSessionsError).toBeNull();
  });

  it('expone un error de completed sessions sin convertirlo en datos', async () => {
    const repos = repositories({ completedError: new Error('historial no disponible') });
    const { result } = renderHook(() => useHistory(), {
      wrapper: wrapperFor(repos),
    });

    await waitFor(() => expect(result.current.completedSessionsLoading).toBe(false));
    expect(result.current.recentCompletedSessions).toEqual([]);
    expect(result.current.completedSessionsError).toBe('historial no disponible');
  });

  it('no carga attempts durante el montaje', async () => {
    const repos = repositories();
    const { result } = renderHook(() => useHistory(), {
      wrapper: wrapperFor(repos),
    });

    await waitFor(() => expect(result.current.completedSessionsLoading).toBe(false));
    expect(repos.attemptRepository.getAttemptsBySession).not.toHaveBeenCalled();
    expect(repos.attemptRepository.getRecentAttempts).not.toHaveBeenCalled();
  });

  it('consulta attempts de forma lazy y mantiene su error independiente', async () => {
    const repos = repositories({ attemptsError: new Error('attempts no disponibles') });
    const { result } = renderHook(() => useHistory(), {
      wrapper: wrapperFor(repos),
    });
    await waitFor(() => expect(result.current.completedSessionsLoading).toBe(false));

    await act(async () => {
      await expect(result.current.getAttemptsBySession('session-1')).rejects.toThrow(
        'attempts no disponibles',
      );
    });

    expect(result.current.attemptsError).toBe('attempts no disponibles');
    expect(result.current.completedSessionsError).toBeNull();
    expect(result.current.recentCompletedSessions).toEqual([COMPLETED]);
  });

  it('permite leer attempts aunque completed sessions falle', async () => {
    const repos = repositories({ completedError: new Error('fallo completed') });
    const { result } = renderHook(() => useHistory(), {
      wrapper: wrapperFor(repos),
    });
    await waitFor(() => expect(result.current.completedSessionsLoading).toBe(false));

    let attempts: Attempt[] = [];
    await act(async () => {
      attempts = await result.current.getAttemptsBySession('session-1');
    });

    expect(attempts).toEqual([ATTEMPT]);
    expect(result.current.attemptsError).toBeNull();
    expect(result.current.completedSessionsError).toBe('fallo completed');
  });

  it('termina en un estado coherente bajo StrictMode', async () => {
    const repos = repositories();
    const { result } = renderHook(() => useHistory(), {
      wrapper: wrapperFor(repos, true),
    });

    await waitFor(() => expect(result.current.completedSessionsLoading).toBe(false));
    expect(result.current.recentCompletedSessions).toEqual([COMPLETED]);
    expect(result.current.completedSessionsError).toBeNull();
  });

  it('falla explícitamente fuera del provider', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useHistory())).toThrow(
      'useHistory debe usarse dentro de <HistoryProvider>',
    );
    consoleError.mockRestore();
  });
});
