import { readFileSync } from 'node:fs';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { ProgressProvider } from '@/contexts/ProgressContext';
import { useProgress } from '@/hooks/useProgress';
import { useSessionCompletion } from '@/hooks/useSessionCompletion';
import type { ExerciseSession, ExerciseStep } from '@/types/exercise';
import type {
  Attempt,
  CompletedSession,
  ConceptProgress,
  UserAnswer,
} from '@/types/progress';
import type {
  IAttemptRepository,
  ICompletedSessionRepository,
  IProgressRepository,
} from '@/types/repository';
import { SessionCompletionProvider } from './SessionCompletionContext';

const COMPLETED_AT = '2026-09-02T15:30:00.000Z';

const step = (id: string): ExerciseStep => ({
  id,
  type: 'code-reading',
  prompt: id,
  code: null,
  language: null,
  options: [],
  errorLines: null,
  errorType: null,
  testCases: null,
  expectedPatterns: null,
  explanation: '',
  hints: [],
  stepOrder: Number(id.slice(-1)),
});

const session: ExerciseSession = {
  id: 'session-arrays-01',
  title: 'Arrays',
  conceptId: 'js-arrays',
  technologyId: 'javascript',
  difficulty: 'intermediate',
  version: '1.0.0',
  status: 'published',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: null,
  steps: [step('step-1'), step('step-2')],
};

const answers: UserAnswer[] = [
  {
    stepId: 'step-1',
    stepType: 'code-reading',
    answer: 'a',
    isCorrect: true,
    timeSpentMs: 100,
    hintsUsed: 0,
  },
  {
    stepId: 'step-2',
    stepType: 'predict-output',
    answer: 'b',
    isCorrect: false,
    timeSpentMs: 50,
    hintsUsed: 1,
  },
];

const progressOf = (): ConceptProgress => ({
  conceptId: session.conceptId,
  domain: 64,
  totalAttempts: 8,
  correctAttempts: 6,
  difficultyDistribution: {
    beginner: { total: 4, correct: 3 },
    intermediate: { total: 3, correct: 2 },
    advanced: { total: 1, correct: 1 },
  },
  recentErrors: [
    {
      stepType: 'fix-code',
      errorType: 'runtime',
      timestamp: '2026-08-01T10:00:00.000Z',
      sessionId: 'anterior',
    },
  ],
  lastPracticed: '2026-08-01T10:00:00.000Z',
  schemaVersion: 1,
});

class FakeProgressRepository implements IProgressRepository {
  calls = 0;
  updates: ConceptProgress[] = [];
  failures = 0;
  gate: Promise<void> | null = null;

  constructor(
    private readonly events: string[],
    private stored: ConceptProgress[] = [],
  ) {}

  async getConceptProgress(conceptId: string): Promise<ConceptProgress | null> {
    return this.stored.find((item) => item.conceptId === conceptId) ?? null;
  }

  async getAllProgress(): Promise<ConceptProgress[]> {
    return this.stored;
  }

  async updateProgress(
    conceptId: string,
    progress: ConceptProgress,
  ): Promise<void> {
    this.calls += 1;
    this.events.push('progress');
    if (this.failures > 0) {
      this.failures -= 1;
      throw new Error('fallo progress');
    }
    if (this.gate !== null) await this.gate;

    this.updates.push(progress);
    this.stored = [
      ...this.stored.filter((item) => item.conceptId !== conceptId),
      progress,
    ];
  }

  async clearProgress(): Promise<void> {
    this.stored = [];
  }
}

class FakeAttemptRepository implements IAttemptRepository {
  calls: string[] = [];
  attempts: Attempt[] = [];
  failOnceForId: string | null = null;
  private failed = false;

  constructor(private readonly events: string[]) {}

  async saveAttempt(attempt: Attempt): Promise<void> {
    this.calls.push(attempt.id);
    this.events.push(`attempt:${attempt.id}`);
    if (attempt.id === this.failOnceForId && !this.failed) {
      this.failed = true;
      throw new Error('fallo attempt');
    }
    this.attempts.push(attempt);
  }

  async getAttemptsBySession(sessionId: string): Promise<Attempt[]> {
    return this.attempts.filter((attempt) => attempt.sessionId === sessionId);
  }

  async getRecentAttempts(limit: number): Promise<Attempt[]> {
    return this.attempts.slice(0, limit);
  }

  async clearAttempts(): Promise<void> {
    this.attempts = [];
  }
}

class FakeCompletedSessionRepository
  implements ICompletedSessionRepository
{
  calls = 0;
  sessions: CompletedSession[] = [];
  failures = 0;

  constructor(private readonly events: string[]) {}

  async save(completedSession: CompletedSession): Promise<void> {
    this.calls += 1;
    this.events.push('completed');
    if (this.failures > 0) {
      this.failures -= 1;
      throw new Error('fallo completed');
    }
    this.sessions.push(completedSession);
  }

  async getBySessionId(sessionId: string): Promise<CompletedSession | null> {
    return this.sessions.find((item) => item.sessionId === sessionId) ?? null;
  }

  async getRecent(limit: number): Promise<CompletedSession[]> {
    return this.sessions.slice(0, limit);
  }

  async clear(): Promise<void> {
    this.sessions = [];
  }
}

const mount = (previous?: ConceptProgress) => {
  const events: string[] = [];
  const progressRepository = new FakeProgressRepository(
    events,
    previous === undefined ? [] : [previous],
  );
  const attemptRepository = new FakeAttemptRepository(events);
  const completedSessionRepository = new FakeCompletedSessionRepository(events);
  const ids = ['attempt-1', 'attempt-2', 'completed-1'];
  const now = vi.fn(() => new Date(COMPLETED_AT));
  const createId = vi.fn(() => ids.shift() ?? 'id-extra');
  const wrapper = ({ children }: { children: ReactNode }) => (
    <ProgressProvider repository={progressRepository}>
      <SessionCompletionProvider
        attemptRepository={attemptRepository}
        completedSessionRepository={completedSessionRepository}
        now={now}
        createId={createId}
      >
        {children}
      </SessionCompletionProvider>
    </ProgressProvider>
  );
  const view = renderHook(
    () => ({ completion: useSessionCompletion(), progress: useProgress() }),
    { wrapper },
  );

  return {
    view,
    events,
    progressRepository,
    attemptRepository,
    completedSessionRepository,
    now,
    createId,
  };
};

const waitUntilLoaded = async (view: ReturnType<typeof mount>['view']) => {
  await waitFor(() => expect(view.result.current.progress.isLoading).toBe(false));
};

const complete = async (fixture: ReturnType<typeof mount>) => {
  return act(() =>
    fixture.view.result.current.completion.completeSession(
      'run-1',
      session,
      answers,
    ),
  );
};

const completeCapturingError = async (fixture: ReturnType<typeof mount>) => {
  let error: unknown;
  await act(async () => {
    try {
      await fixture.view.result.current.completion.completeSession(
        'run-1',
        session,
        answers,
      );
    } catch (reason: unknown) {
      error = reason;
    }
  });
  return error;
};

describe('SessionCompletionProvider (T050)', () => {
  it('crea progreso inicial, attempts y completed session con un único plan', async () => {
    const fixture = mount();
    await waitUntilLoaded(fixture.view);

    const score = await complete(fixture);

    expect(fixture.progressRepository.updates).toEqual([
      {
        conceptId: session.conceptId,
        domain: 0,
        totalAttempts: 2,
        correctAttempts: 1,
        difficultyDistribution: {
          beginner: { total: 0, correct: 0 },
          intermediate: { total: 2, correct: 1 },
          advanced: { total: 0, correct: 0 },
        },
        recentErrors: [],
        lastPracticed: COMPLETED_AT,
        schemaVersion: 1,
      },
    ]);
    expect(score).toEqual({
      totalSteps: 2,
      correctSteps: 1,
      accuracy: 50,
      timeSpentMs: 150,
      hintsUsed: 1,
      domainImpact: { previousDomain: 0, newDomain: 0, change: 0 },
    });
    expect(fixture.attemptRepository.attempts).toEqual([
      {
        id: 'attempt-1',
        sessionId: session.id,
        ...answers[0],
        createdAt: COMPLETED_AT,
      },
      {
        id: 'attempt-2',
        sessionId: session.id,
        ...answers[1],
        createdAt: COMPLETED_AT,
      },
    ]);
    expect(fixture.completedSessionRepository.sessions).toEqual([
      {
        id: 'completed-1',
        sessionId: session.id,
        technologyId: session.technologyId,
        conceptId: session.conceptId,
        totalSteps: 2,
        correctSteps: 1,
        accuracy: 50,
        timeSpentMs: 150,
        completedAt: COMPLETED_AT,
      },
    ]);
    expect(fixture.events).toEqual([
      'progress',
      'attempt:attempt-1',
      'attempt:attempt-2',
      'completed',
    ]);
    expect(fixture.now).toHaveBeenCalledTimes(1);
    expect(fixture.createId).toHaveBeenCalledTimes(3);

    await complete(fixture);
    expect(fixture.events).toHaveLength(4);
    expect(fixture.now).toHaveBeenCalledTimes(1);
    expect(fixture.createId).toHaveBeenCalledTimes(3);
  });

  it('acumula métricas existentes conservando domain y recentErrors', async () => {
    const previous = progressOf();
    const fixture = mount(previous);
    await waitUntilLoaded(fixture.view);

    const score = await complete(fixture);
    const persisted = fixture.progressRepository.updates[0];

    expect(persisted).toMatchObject({
      domain: 64,
      totalAttempts: 10,
      correctAttempts: 7,
      difficultyDistribution: {
        beginner: { total: 4, correct: 3 },
        intermediate: { total: 5, correct: 3 },
        advanced: { total: 1, correct: 1 },
      },
      recentErrors: previous.recentErrors,
      lastPracticed: COMPLETED_AT,
    });
    expect(score.domainImpact).toEqual({
      previousDomain: 64,
      newDomain: 64,
      change: 0,
    });
  });

  it('reanuda desde progress cuando su primera escritura falla', async () => {
    const fixture = mount();
    fixture.progressRepository.failures = 1;
    await waitUntilLoaded(fixture.view);

    expect(await completeCapturingError(fixture)).toEqual(
      new Error('fallo progress'),
    );
    expect(fixture.events).toEqual(['progress']);

    await complete(fixture);
    expect(fixture.events).toEqual([
      'progress',
      'progress',
      'attempt:attempt-1',
      'attempt:attempt-2',
      'completed',
    ]);
    expect(fixture.progressRepository.updates).toHaveLength(1);
  });

  it('reanuda en el Attempt fallido sin repetir progress ni anteriores', async () => {
    const fixture = mount();
    fixture.attemptRepository.failOnceForId = 'attempt-2';
    await waitUntilLoaded(fixture.view);

    expect(await completeCapturingError(fixture)).toEqual(
      new Error('fallo attempt'),
    );
    expect(fixture.attemptRepository.attempts.map((item) => item.id)).toEqual([
      'attempt-1',
    ]);

    await complete(fixture);
    expect(fixture.progressRepository.calls).toBe(1);
    expect(fixture.attemptRepository.calls).toEqual([
      'attempt-1',
      'attempt-2',
      'attempt-2',
    ]);
    expect(fixture.attemptRepository.attempts.map((item) => item.id)).toEqual([
      'attempt-1',
      'attempt-2',
    ]);
    expect(fixture.completedSessionRepository.calls).toBe(1);
    expect(fixture.now).toHaveBeenCalledTimes(1);
    expect(fixture.createId).toHaveBeenCalledTimes(3);
  });

  it('reanuda en CompletedSession sin repetir progress ni attempts', async () => {
    const fixture = mount();
    fixture.completedSessionRepository.failures = 1;
    await waitUntilLoaded(fixture.view);

    expect(await completeCapturingError(fixture)).toEqual(
      new Error('fallo completed'),
    );
    await complete(fixture);

    expect(fixture.progressRepository.calls).toBe(1);
    expect(fixture.attemptRepository.calls).toEqual([
      'attempt-1',
      'attempt-2',
    ]);
    expect(fixture.completedSessionRepository.calls).toBe(2);
    expect(fixture.completedSessionRepository.sessions).toHaveLength(1);
    expect(fixture.now).toHaveBeenCalledTimes(1);
    expect(fixture.createId).toHaveBeenCalledTimes(3);
  });

  it('comparte una única operación entre dos llamadas concurrentes', async () => {
    const fixture = mount();
    let release = (): void => {};
    fixture.progressRepository.gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    await waitUntilLoaded(fixture.view);

    const first = fixture.view.result.current.completion.completeSession(
      'run-1',
      session,
      answers,
    );
    const second = fixture.view.result.current.completion.completeSession(
      'run-1',
      session,
      answers,
    );

    expect(second).toBe(first);
    expect(fixture.progressRepository.calls).toBe(1);
    expect(fixture.events).toEqual(['progress']);

    await act(async () => {
      release();
      await Promise.all([first, second]);
    });
    expect(fixture.events).toEqual([
      'progress',
      'attempt:attempt-1',
      'attempt:attempt-2',
      'completed',
    ]);
  });

  it('useSessionCompletion falla claramente fuera de su provider', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => renderHook(() => useSessionCompletion())).toThrow(
      'useSessionCompletion debe usarse dentro de <SessionCompletionProvider>',
    );

    consoleError.mockRestore();
  });

  it('mantiene almacenamiento concreto y calculateDomain fuera del flujo', () => {
    for (const path of [
      'src/contexts/SessionCompletionContext.tsx',
      'src/contexts/session-completion-context.ts',
      'src/hooks/useSessionCompletion.ts',
      'src/hooks/useSession.ts',
    ]) {
      const source = readFileSync(path, 'utf8');
      expect(source, path).not.toMatch(
        /localStorage|sessionStorage|LocalAttemptRepository|LocalCompletedSessionRepository/,
      );
    }

    expect(
      readFileSync('src/contexts/SessionCompletionContext.tsx', 'utf8'),
    ).not.toMatch(/\bcalculateDomain\(/);
  });
});
