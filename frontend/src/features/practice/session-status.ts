import type { ExerciseSession } from '@/types/exercise';
import type { CompletedSession } from '@/types/progress';

export type SessionStatus =
  | 'completed'
  | 'in-progress'
  | 'available'
  | 'locked';

export type CompletionLookup =
  | { status: 'checking' }
  | { status: 'error'; message: string }
  | { status: 'ready'; completedSession: CompletedSession | null };

export type RecoveryState =
  | { status: 'checking' }
  | { status: 'ready'; sessionId: string | null; currentStep: number | null }
  | { status: 'error'; message: string };

export type ResolvedSessionState =
  | { status: 'checking' }
  | { status: 'error'; message: string }
  | {
      status: 'ready';
      sessionStatus: SessionStatus;
      completedSession: CompletedSession | null;
      currentStep: number | null;
    };

export const CHECKING_COMPLETION: CompletionLookup = { status: 'checking' };
export const CHECKING_SESSION_STATE: ResolvedSessionState = { status: 'checking' };

export function resolveSessionState(
  session: ExerciseSession,
  completion: CompletionLookup,
  recovery: RecoveryState,
): ResolvedSessionState {
  if (completion.status === 'checking') return completion;
  if (completion.status === 'error') return completion;
  if (completion.completedSession !== null) {
    return {
      status: 'ready',
      sessionStatus: 'completed',
      completedSession: completion.completedSession,
      currentStep: null,
    };
  }
  if (recovery.status === 'checking') return recovery;
  if (recovery.status === 'error') return recovery;

  return {
    status: 'ready',
    sessionStatus:
      session.status === 'published'
        ? recovery.sessionId === session.id
          ? 'in-progress'
          : 'available'
        : 'locked',
    completedSession: null,
    currentStep: recovery.sessionId === session.id ? recovery.currentStep : null,
  };
}
