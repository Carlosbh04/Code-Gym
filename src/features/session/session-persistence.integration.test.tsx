import { StrictMode, type ReactNode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ContentProvider } from '@/contexts/ContentContext';
import { ExecutionProvider } from '@/contexts/ExecutionContext';
import { ProgressProvider } from '@/contexts/ProgressContext';
import { SessionCompletionProvider } from '@/contexts/SessionCompletionContext';
import { SessionRecoveryProvider } from '@/contexts/SessionRecoveryContext';
import { useProgress } from '@/hooks/useProgress';
import { useSession } from '@/hooks/useSession';
import { StaticContentRepository } from '@/lib/repositories/StaticContentRepository';
import { FakeExecution } from '@/test/fake-execution';
import { FakeSessionRecoveryStore } from '@/test/fake-session-recovery';
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

const SESSION_ID = 'js-arrays-map-vs-foreach-01';
const COMPLETED_AT = '2026-09-02T18:00:00.000Z';
const SOLUTION = 'function dobles(numeros) {\n  return numeros.map((n) => n * 2);\n}';

const answers: UserAnswer[] = [
  {
    stepId: 'step-1',
    stepType: 'code-reading',
    answer: 'b',
    isCorrect: true,
    timeSpentMs: 100,
    hintsUsed: 0,
  },
  {
    stepId: 'step-2',
    stepType: 'predict-output',
    answer: 'a',
    isCorrect: true,
    timeSpentMs: 200,
    hintsUsed: 0,
  },
  {
    stepId: 'step-3',
    stepType: 'find-error',
    answer: { line: 2, errorType: 'conceptual' },
    isCorrect: true,
    timeSpentMs: 300,
    hintsUsed: 0,
  },
  {
    stepId: 'step-4',
    stepType: 'fix-code',
    answer: SOLUTION,
    isCorrect: true,
    timeSpentMs: 400,
    hintsUsed: 0,
  },
];

class InstrumentedProgressRepository implements IProgressRepository {
  calls = 0;
  failures = 0;
  updates: ConceptProgress[] = [];
  gate: Promise<void> | null = null;
  private stored: ConceptProgress[] = [];

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

class InstrumentedAttemptRepository implements IAttemptRepository {
  calls: string[] = [];
  attempts: Attempt[] = [];
  failOnceForId: string | null = null;
  private failed = false;

  async saveAttempt(attempt: Attempt): Promise<void> {
    this.calls.push(attempt.id);
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

class InstrumentedCompletedSessionRepository
  implements ICompletedSessionRepository
{
  calls = 0;
  failures = 0;
  sessions: CompletedSession[] = [];

  async save(session: CompletedSession): Promise<void> {
    this.calls += 1;
    if (this.failures > 0) {
      this.failures -= 1;
      throw new Error('fallo completed');
    }
    this.sessions.push(session);
  }

  async getBySessionId(sessionId: string): Promise<CompletedSession | null> {
    return this.sessions.find((session) => session.sessionId === sessionId) ?? null;
  }

  async getRecent(limit: number): Promise<CompletedSession[]> {
    return this.sessions.slice(0, limit);
  }

  async clear(): Promise<void> {
    this.sessions = [];
  }
}

function recoverySnapshot() {
  return {
    sessionId: SESSION_ID,
    currentStep: 3,
    answers,
    elapsedMs: 1_000,
    hintsRevealed: [],
    startTime: 1_000,
  };
}

function mountIntegratedSession(strict = false) {
  const progressRepository = new InstrumentedProgressRepository();
  const attemptRepository = new InstrumentedAttemptRepository();
  const completedSessionRepository =
    new InstrumentedCompletedSessionRepository();
  const recovery = new FakeSessionRecoveryStore();
  const execution = new FakeExecution();
  const contentRepository = new StaticContentRepository();
  const ids = [
    'attempt-1',
    'attempt-2',
    'attempt-3',
    'attempt-4',
    'completed-1',
  ];
  recovery.snapshot = recoverySnapshot();

  const providers = ({ children }: { children: ReactNode }) => (
    <ProgressProvider repository={progressRepository}>
      <SessionCompletionProvider
        attemptRepository={attemptRepository}
        completedSessionRepository={completedSessionRepository}
        now={() => new Date(COMPLETED_AT)}
        createId={() => ids.shift() ?? 'unexpected-id'}
      >
        <SessionRecoveryProvider store={recovery}>
          <ContentProvider repository={contentRepository}>
            <ExecutionProvider engine={execution.value}>
              {children}
            </ExecutionProvider>
          </ContentProvider>
        </SessionRecoveryProvider>
      </SessionCompletionProvider>
    </ProgressProvider>
  );
  const wrapper = ({ children }: { children: ReactNode }) => {
    const tree = providers({ children });
    return strict ? <StrictMode>{tree}</StrictMode> : tree;
  };
  const view = renderHook(
    () => ({ session: useSession(SESSION_ID), progress: useProgress() }),
    { wrapper },
  );

  return {
    view,
    progressRepository,
    attemptRepository,
    completedSessionRepository,
    recovery,
  };
}

type Fixture = ReturnType<typeof mountIntegratedSession>;

async function resumeCompletedAnswers(fixture: Fixture): Promise<void> {
  await waitFor(() => {
    expect(fixture.view.result.current.session.recoveryStatus).toBe('available');
    expect(fixture.view.result.current.progress.isLoading).toBe(false);
  });

  act(() => fixture.view.result.current.session.continueRecovery());

  await waitFor(() => {
    expect(fixture.view.result.current.session.recoveryStatus).toBe('none');
    expect(fixture.view.result.current.session.session).not.toBeNull();
    expect(fixture.view.result.current.session.state.answers).toHaveLength(4);
  });
  await waitFor(() => expect(fixture.recovery.snapshot?.answers).toHaveLength(4));
}

function startCompletion(fixture: Fixture): void {
  act(() => fixture.view.result.current.session.next());
}

async function expectCompletionFailure(
  fixture: Fixture,
  message: string,
): Promise<void> {
  await waitFor(() =>
    expect(fixture.view.result.current.session.completionError).toBe(message),
  );
  expect(fixture.view.result.current.session.state.isComplete).toBe(false);
  expect(fixture.view.result.current.session.state.answers).toEqual(answers);
  expect(fixture.recovery.snapshot?.answers).toEqual(answers);
  expect(fixture.recovery.clearCalls).toBe(0);
}

async function retryUntilComplete(fixture: Fixture): Promise<void> {
  act(() => fixture.view.result.current.session.retryCompletion());
  await waitFor(() =>
    expect(fixture.view.result.current.session.state.isComplete).toBe(true),
  );
  await waitFor(() => expect(fixture.recovery.clearCalls).toBe(1));
}

describe('sesión · completion y recovery integrados (T053)', () => {
  it('conserva recovery y answers si falla progress, y el retry completa todo', async () => {
    const fixture = mountIntegratedSession();
    fixture.progressRepository.failures = 1;
    await resumeCompletedAnswers(fixture);

    startCompletion(fixture);
    await expectCompletionFailure(fixture, 'fallo progress');

    expect(fixture.progressRepository.calls).toBe(1);
    expect(fixture.progressRepository.updates).toHaveLength(0);
    expect(fixture.attemptRepository.calls).toHaveLength(0);
    expect(fixture.attemptRepository.attempts).toHaveLength(0);
    expect(fixture.completedSessionRepository.calls).toBe(0);

    await retryUntilComplete(fixture);

    expect(fixture.progressRepository.calls).toBe(2);
    expect(fixture.progressRepository.updates).toHaveLength(1);
    expect(fixture.attemptRepository.attempts).toHaveLength(4);
    expect(fixture.completedSessionRepository.sessions).toHaveLength(1);
    expect(fixture.recovery.snapshot).toBeNull();
  });

  it('reanuda en el attempt intermedio sin repetir progress ni duplicar attempts', async () => {
    const fixture = mountIntegratedSession();
    fixture.attemptRepository.failOnceForId = 'attempt-2';
    await resumeCompletedAnswers(fixture);

    startCompletion(fixture);
    await expectCompletionFailure(fixture, 'fallo attempt');

    expect(fixture.progressRepository.calls).toBe(1);
    expect(fixture.progressRepository.updates).toHaveLength(1);
    expect(fixture.attemptRepository.calls).toEqual(['attempt-1', 'attempt-2']);
    expect(fixture.attemptRepository.attempts.map(({ id }) => id)).toEqual([
      'attempt-1',
    ]);
    expect(fixture.completedSessionRepository.calls).toBe(0);

    await retryUntilComplete(fixture);

    expect(fixture.progressRepository.calls).toBe(1);
    expect(fixture.attemptRepository.calls).toEqual([
      'attempt-1',
      'attempt-2',
      'attempt-2',
      'attempt-3',
      'attempt-4',
    ]);
    expect(fixture.attemptRepository.attempts.map(({ id }) => id)).toEqual([
      'attempt-1',
      'attempt-2',
      'attempt-3',
      'attempt-4',
    ]);
    expect(fixture.completedSessionRepository.sessions).toHaveLength(1);
    expect(fixture.recovery.snapshot).toBeNull();
  });

  it('reanuda únicamente CompletedSession y limpia recovery después del éxito', async () => {
    const fixture = mountIntegratedSession();
    fixture.completedSessionRepository.failures = 1;
    await resumeCompletedAnswers(fixture);

    startCompletion(fixture);
    await expectCompletionFailure(fixture, 'fallo completed');

    expect(fixture.progressRepository.calls).toBe(1);
    expect(fixture.attemptRepository.calls).toHaveLength(4);
    expect(fixture.completedSessionRepository.calls).toBe(1);
    expect(fixture.completedSessionRepository.sessions).toHaveLength(0);

    let completeWhenCleared = false;
    fixture.recovery.onClear = () => {
      completeWhenCleared = fixture.view.result.current.session.state.isComplete;
    };
    await retryUntilComplete(fixture);

    expect(fixture.progressRepository.calls).toBe(1);
    expect(fixture.attemptRepository.calls).toHaveLength(4);
    expect(fixture.attemptRepository.attempts).toHaveLength(4);
    expect(fixture.completedSessionRepository.calls).toBe(2);
    expect(fixture.completedSessionRepository.sessions).toHaveLength(1);
    expect(completeWhenCleared).toBe(true);
    expect(fixture.recovery.snapshot).toBeNull();
  });

  it('StrictMode bloquea doble completion y no duplica persistencia ni cleanup', async () => {
    const fixture = mountIntegratedSession(true);
    let releaseProgress = (): void => {};
    fixture.progressRepository.gate = new Promise<void>((resolve) => {
      releaseProgress = resolve;
    });
    await resumeCompletedAnswers(fixture);

    act(() => {
      fixture.view.result.current.session.next();
      fixture.view.result.current.session.next();
    });

    await waitFor(() => expect(fixture.progressRepository.calls).toBe(1));
    expect(fixture.view.result.current.session.state.isComplete).toBe(false);
    expect(fixture.recovery.clearCalls).toBe(0);
    expect(fixture.recovery.snapshot).not.toBeNull();

    await act(async () => {
      releaseProgress();
    });
    await waitFor(() =>
      expect(fixture.view.result.current.session.state.isComplete).toBe(true),
    );
    await waitFor(() => expect(fixture.recovery.clearCalls).toBe(1));

    expect(fixture.recovery.loadCalls).toBe(1);
    expect(fixture.progressRepository.updates).toHaveLength(1);
    expect(fixture.attemptRepository.calls).toEqual([
      'attempt-1',
      'attempt-2',
      'attempt-3',
      'attempt-4',
    ]);
    expect(fixture.attemptRepository.attempts).toHaveLength(4);
    expect(fixture.completedSessionRepository.calls).toBe(1);
    expect(fixture.completedSessionRepository.sessions).toHaveLength(1);
    expect(fixture.recovery.snapshot).toBeNull();
  });
});
