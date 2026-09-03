import { useCallback, type ReactNode } from 'react';
import { useHistory } from '@/hooks/useHistory';
import { useProgress } from '@/hooks/useProgress';
import type { IAttemptRepository, ICompletedSessionRepository, IProgressRepository } from '@/types/repository';

import { ResetProgressContext } from './reset-progress-context';

export function ResetProgressProvider({ progressRepository, attemptRepository, completedSessionRepository, children }: {
  progressRepository: IProgressRepository; attemptRepository: IAttemptRepository;
  completedSessionRepository: ICompletedSessionRepository; children: ReactNode;
}) {
  const { resetState: resetProgressState } = useProgress();
  const { resetState: resetHistoryState } = useHistory();
  const resetProgress = useCallback(async () => {
    await progressRepository.clearProgress();
    await attemptRepository.clearAttempts();
    await completedSessionRepository.clear();
    resetProgressState?.();
    resetHistoryState?.();
  }, [progressRepository, attemptRepository, completedSessionRepository, resetProgressState, resetHistoryState]);
  return <ResetProgressContext.Provider value={{ resetProgress }}>{children}</ResetProgressContext.Provider>;
}
