import { type ReactNode } from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { ContentContext } from '@/contexts/content-context';
import { HistoryContext } from '@/contexts/history-context';
import { ProgressContext } from '@/contexts/progress-context';
import { ResetProgressContext } from '@/contexts/reset-progress-context';
import type { ContentContextValue, Concept, Technology, Topic } from '@/types/content';
import type { ExerciseSession } from '@/types/exercise';
import type { HistoryContextValue } from '@/types/history';
import type { CompletedSession, ConceptProgress, ProgressContextValue } from '@/types/progress';
import DashboardPage from './DashboardPage';

const JAVASCRIPT: Technology = { id: 'javascript', name: 'JavaScript', icon: 'JS', description: 'El lenguaje de la web.' };
const ARRAYS_TOPIC: Topic = { id: 'js-arrays', name: 'Arrays', technologyId: 'javascript', description: 'Métodos de arrays.' };
const CONCEPTS: Concept[] = [
  { id: 'arrays', name: 'Arrays', topicId: ARRAYS_TOPIC.id, technologyId: 'javascript', contentMarkdown: '' },
  { id: 'functions', name: 'Functions', topicId: ARRAYS_TOPIC.id, technologyId: 'javascript', contentMarkdown: '' },
];
const SESSION: ExerciseSession = {
  id: 'arrays-session', title: 'Filter no debería mutar', conceptId: 'arrays', technologyId: 'javascript', difficulty: 'beginner', version: '1.0.0', status: 'published', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: null,
  steps: [{ id: 'step-1', type: 'find-error', prompt: 'Localiza el error', code: 'const value = 1;', language: 'javascript', options: null, errorLines: [1], errorType: 'lógico', testCases: null, expectedPatterns: null, explanation: 'Explicación real.', hints: [], stepOrder: 1 }],
};
const COMPLETED: CompletedSession = { id: 'completion-1', sessionId: SESSION.id, technologyId: 'javascript', conceptId: 'arrays', totalSteps: 4, correctSteps: 3, accuracy: 75, timeSpentMs: 62_000, completedAt: '2026-09-02T10:00:00.000Z' };

const progressOf = (conceptId: string, totalAttempts: number, correctAttempts: number, lastPracticed = '2026-09-02T10:00:00.000Z'): ConceptProgress => ({
  conceptId, domain: 0, totalAttempts, correctAttempts, difficultyDistribution: { beginner: { total: totalAttempts, correct: correctAttempts }, intermediate: { total: 0, correct: 0 }, advanced: { total: 0, correct: 0 } }, recentErrors: [], lastPracticed, schemaVersion: 1,
});

interface RenderOptions {
  progress?: ConceptProgress[];
  progressLoading?: boolean;
  progressError?: string | null;
  completed?: CompletedSession[];
  historyLoading?: boolean;
  historyError?: string | null;
  resetProgress?: () => Promise<void>;
}

function renderDashboard({ progress = [], progressLoading = false, progressError = null, completed = [], historyLoading = false, historyError = null, resetProgress = async () => {} }: RenderOptions = {}) {
  const progressValue: ProgressContextValue = { progress: new Map(progress.map((item) => [item.conceptId, item])), updateProgress: vi.fn(), getConceptDomain: vi.fn(), isLoading: progressLoading, error: progressError };
  const historyValue: HistoryContextValue = { recentCompletedSessions: completed, completedSessionsLoading: historyLoading, completedSessionsError: historyError, getCompletedSession: vi.fn(), getAttemptsBySession: vi.fn(), attemptsLoading: false, attemptsError: null };
  const contentValue: ContentContextValue = {
    technologies: [JAVASCRIPT], getTechnology: vi.fn((id: string) => id === JAVASCRIPT.id ? JAVASCRIPT : undefined), getTopics: vi.fn(async (id: string) => id === JAVASCRIPT.id ? [ARRAYS_TOPIC] : []), getConceptsByTopic: vi.fn(async (id: string) => id === ARRAYS_TOPIC.id ? CONCEPTS : []), getConcept: vi.fn(async (id: string) => CONCEPTS.find((concept) => concept.id === id) ?? null), getSessionsByConcept: vi.fn(async (id: string) => id === 'arrays' ? [SESSION] : []), getSession: vi.fn(async (id: string) => id === SESSION.id ? SESSION : null), isLoading: false,
  };
  function Wrapper({ children }: { children: ReactNode }) {
    return <ProgressContext.Provider value={progressValue}><HistoryContext.Provider value={historyValue}><ContentContext.Provider value={contentValue}><ResetProgressContext.Provider value={{ resetProgress }}><MemoryRouter><main>{children}</main></MemoryRouter></ResetProgressContext.Provider></ContentContext.Provider></HistoryContext.Provider></ProgressContext.Provider>;
  }
  return render(<DashboardPage />, { wrapper: Wrapper });
}

describe('DashboardPage', () => {
  it('mantiene un loading accesible mientras se carga el progreso', () => {
    renderDashboard({ progressLoading: true });
    expect(screen.getByRole('heading', { level: 1, name: 'Cargando progreso…' })).toBeInTheDocument();
    expect(screen.getByRole('region')).toHaveAttribute('aria-busy', 'true');
  });

  it('ofrece un empty state limpio para usuarios sin actividad', async () => {
    renderDashboard();
    expect(await screen.findByRole('heading', { level: 1, name: 'Dashboard' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Aún no tienes actividad' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Empezar a entrenar' })).toHaveAttribute('href', '/#technologies');
    expect(screen.queryByText(/XP|racha|nivel/i)).toBeNull();
  });

  it('muestra métricas, progreso global y progreso por tecnología derivados del historial real', async () => {
    renderDashboard({ progress: [progressOf('arrays', 10, 7), progressOf('functions', 5, 5)], completed: [COMPLETED] });
    expect(await screen.findByRole('heading', { name: 'Progreso por tecnología' })).toBeInTheDocument();
    expect(await screen.findByText('2 de 2 conceptos')).toBeInTheDocument();
    expect(screen.getByText('Sesiones recientes')).toBeInTheDocument();
    expect(screen.getByText('Conceptos practicados')).toBeInTheDocument();
    expect(screen.getByText('Tecnologías trabajadas')).toBeInTheDocument();
    expect(screen.getAllByText('80%')).toHaveLength(2);
    expect(screen.getAllByText('1 min 2 s')).toHaveLength(2);
    expect(screen.getByRole('progressbar', { name: 'Conceptos practicados' })).toHaveAttribute('aria-valuetext', '2 de 2 conceptos practicados');
    expect(screen.getByRole('link', { name: 'Ver tecnología' })).toHaveAttribute('href', '/tech/javascript');
  });

  it('muestra actividad reciente real, ordenada, y enlaza a su resultado', async () => {
    renderDashboard({ progress: [progressOf('arrays', 10, 7)], completed: [COMPLETED] });
    const activity = await screen.findByRole('region', { name: 'Actividad reciente' });
    expect(within(activity).getByText('Filter no debería mutar')).toBeInTheDocument();
    expect(within(activity).getByText('3/4 aciertos')).toBeInTheDocument();
    expect(within(activity).getByRole('link', { name: 'Ver resultado de Filter no debería mutar' })).toHaveAttribute('href', '/results/arrays-session');
  });

  it('propone una práctica canónica para el concepto prioritario', async () => {
    renderDashboard({ progress: [progressOf('arrays', 10, 5)] });
    expect(await screen.findByRole('link', { name: 'Continuar práctica' })).toHaveAttribute('href', '/practice/arrays-session');
  });

  it('mantiene el error de History acotado a la actividad', async () => {
    renderDashboard({ progress: [progressOf('arrays', 10, 7)], historyError: 'Storage no disponible' });
    expect(await screen.findByRole('heading', { name: 'Progreso por tecnología' })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('No se pudo cargar la actividad reciente: Storage no disponible');
  });

  it('conserva la actividad disponible si falla la lectura de progreso', async () => {
    renderDashboard({ progressError: 'Storage bloqueado', completed: [COMPLETED] });
    expect(screen.getByRole('alert')).toHaveTextContent('Storage bloqueado');
    expect(await screen.findByRole('heading', { name: 'Actividad reciente' })).toBeInTheDocument();
    expect(screen.getByText('Filter no debería mutar')).toBeInTheDocument();
  });

  it('confirma el reset solo tras aceptar en el diálogo', async () => {
    const resetProgress = vi.fn(async () => {});
    renderDashboard({ progress: [progressOf('arrays', 2, 1)], resetProgress });
    await screen.findByRole('heading', { name: 'Siguiente paso' });
    fireEvent.click(screen.getByRole('button', { name: 'Restablecer progreso' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Restablecer progreso' }));
    await waitFor(() => expect(resetProgress).toHaveBeenCalledOnce());
  });

  it('conserva un único main, headings semánticos y ningún sistema ficticio', async () => {
    const { container } = renderDashboard({ progress: [progressOf('arrays', 10, 7)], completed: [COMPLETED] });
    await screen.findByRole('heading', { name: 'Actividad reciente' });
    expect(screen.getAllByRole('main')).toHaveLength(1);
    expect(screen.getAllByRole('heading', { level: 1, name: 'Dashboard' })).toHaveLength(1);
    expect(container).not.toHaveTextContent(/\bXP\b|racha|insignia|nivel|ranking/i);
  });
});
