import type { SessionCompletionContextValue } from '@/contexts/session-completion-context';
import type { ExerciseSession } from '@/types/exercise';
import type { SessionScore, UserAnswer } from '@/types/progress';

const SCORE: SessionScore = {
  totalSteps: 0,
  correctSteps: 0,
  accuracy: 0,
  timeSpentMs: 0,
  hintsUsed: 0,
  domainImpact: { previousDomain: 0, newDomain: 0, change: 0 },
};

interface CompletionCall {
  operationId: string;
  session: ExerciseSession;
  answers: UserAnswer[];
}

/** Doble controlable del canal de finalización usado por tests de sesión. */
export class FakeSessionCompletion {
  readonly calls: CompletionCall[] = [];
  private nextError: string | null = null;
  private deferred: Promise<SessionScore> | null = null;
  private resolveDeferred: ((score: SessionScore) => void) | null = null;

  readonly value: SessionCompletionContextValue = {
    completeSession: (operationId, session, answers) => {
      this.calls.push({ operationId, session, answers });

      if (this.nextError !== null) {
        const message = this.nextError;
        this.nextError = null;
        return Promise.reject(new Error(message));
      }

      return this.deferred ?? Promise.resolve(SCORE);
    },
  };

  failOnce(message: string): void {
    this.nextError = message;
  }

  defer(): void {
    this.deferred = new Promise<SessionScore>((resolve) => {
      this.resolveDeferred = resolve;
    });
  }

  resolve(score: SessionScore = SCORE): void {
    this.resolveDeferred?.(score);
    this.deferred = null;
    this.resolveDeferred = null;
  }
}
