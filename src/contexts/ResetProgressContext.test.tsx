import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { HistoryContext } from '@/contexts/history-context';
import { ProgressContext } from '@/contexts/progress-context';
import { ResetProgressProvider } from './ResetProgressContext';
import { useResetProgress } from '@/hooks/useResetProgress';

const progress = { progress: new Map(), updateProgress: vi.fn(), getConceptDomain: vi.fn(), isLoading: false, error: null, resetState: vi.fn() };
const history = { recentCompletedSessions: [], completedSessionsLoading: false, completedSessionsError: null, getCompletedSession: vi.fn(), getAttemptsBySession: vi.fn(), attemptsLoading: false, attemptsError: null, resetState: vi.fn() };
function Consumer() { const { resetProgress } = useResetProgress(); return <button onClick={() => void resetProgress()}>reset</button>; }

describe('ResetProgressProvider', () => {
  it('coordina los tres borrados y sincroniza ambos contexts', async () => {
    const clearProgress = vi.fn().mockResolvedValue(undefined);
    const clearAttempts = vi.fn().mockResolvedValue(undefined);
    const clear = vi.fn().mockResolvedValue(undefined);
    render(<ProgressContext.Provider value={progress}><HistoryContext.Provider value={history}><ResetProgressProvider progressRepository={{ getConceptProgress: vi.fn(), getAllProgress: vi.fn(), updateProgress: vi.fn(), clearProgress }} attemptRepository={{ saveAttempt: vi.fn(), getAttemptsBySession: vi.fn(), getRecentAttempts: vi.fn(), clearAttempts }} completedSessionRepository={{ save: vi.fn(), getBySessionId: vi.fn(), getRecent: vi.fn(), clear }}><Consumer /></ResetProgressProvider></HistoryContext.Provider></ProgressContext.Provider>);
    fireEvent.click(screen.getByRole('button', { name: 'reset' }));
    await waitFor(() => expect(clear).toHaveBeenCalledOnce());
    expect(clearProgress).toHaveBeenCalledOnce(); expect(clearAttempts).toHaveBeenCalledOnce();
    expect(progress.resetState).toHaveBeenCalledOnce(); expect(history.resetState).toHaveBeenCalledOnce();
  });
});
