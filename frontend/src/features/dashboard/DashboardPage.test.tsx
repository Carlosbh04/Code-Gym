import { type ReactNode } from 'react';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { ContentContext } from '@/contexts/content-context';
import { HistoryContext } from '@/contexts/history-context';
import { ProgressContext } from '@/contexts/progress-context';
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
  steps: [{ id: 'step-1', type: 'find-error', prompt: 'Localiza el error', code: 'const value = 1;', language: 'javascript', options: null, requirements: [], hintCount: 0, stepOrder: 1 }],
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
}

function renderDashboard({ progress = [], progressLoading = false, progressError = null, completed = [], historyLoading = false, historyError = null }: RenderOptions = {}) {
  const progressValue: ProgressContextValue = { progress: new Map(progress.map((item) => [item.conceptId, item])), updateProgress: vi.fn(), getConceptDomain: vi.fn(), isLoading: progressLoading, error: progressError };
  const historyValue: HistoryContextValue = { recentCompletedSessions: completed, completedSessionsLoading: historyLoading, completedSessionsError: historyError, getCompletedSession: vi.fn(), getAttemptsBySession: vi.fn(), attemptsLoading: false, attemptsError: null };
  const contentValue: ContentContextValue = {
    technologies: [JAVASCRIPT], getTechnology: vi.fn((id: string) => id === JAVASCRIPT.id ? JAVASCRIPT : undefined), getTopics: vi.fn(async (id: string) => id === JAVASCRIPT.id ? [ARRAYS_TOPIC] : []), getConceptsByTopic: vi.fn(async (id: string) => id === ARRAYS_TOPIC.id ? CONCEPTS : []), getConcept: vi.fn(async (id: string) => CONCEPTS.find((concept) => concept.id === id) ?? null), getSessionsByConcept: vi.fn(async (id: string) => id === 'arrays' ? [SESSION] : []), getSession: vi.fn(async (id: string) => id === SESSION.id ? SESSION : null), isLoading: false,
  };
  function Wrapper({ children }: { children: ReactNode }) {
    return <ProgressContext.Provider value={progressValue}><HistoryContext.Provider value={historyValue}><ContentContext.Provider value={contentValue}><MemoryRouter><main>{children}</main></MemoryRouter></ContentContext.Provider></HistoryContext.Provider></ProgressContext.Provider>;
  }
  return render(<DashboardPage />, { wrapper: Wrapper });
}

describe('DashboardPage', () => {
  it('mantiene un loading accesible mientras se carga el progreso', () => {
    renderDashboard({ progressLoading: true });
    expect(screen.getByRole('heading', { level: 1, name: 'Cargando progreso…' })).toBeInTheDocument();
    expect(
      screen.getByRole('region', {
        name: 'Cargando progreso',
      }),
    ).toHaveAttribute(
      'aria-busy',
      'true',
    );
  });

  it('ofrece un empty state limpio para usuarios sin actividad', async () => {
    renderDashboard();
    expect(await screen.findByRole('heading', { level: 1, name: 'Progreso' })).toBeInTheDocument();
    expect(screen.getByText('Tu avance en CodeGym. Sigue practicando para dominar más conceptos.')).toBeInTheDocument();
    expect(screen.getByText('Aún no hay sesiones completadas.')).toBeInTheDocument();
    expect(screen.queryByText('Tu camino de aprendizaje')).not.toBeInTheDocument();
    expect(screen.queryByText('Tu progreso de aprendizaje, basado en la práctica que has guardado.')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Aún no tienes actividad' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Empezar a entrenar' })).toHaveAttribute('href', '/tech');
    expect(screen.queryByText(/XP|racha|nivel/i)).toBeNull();
  });

  it('muestra métricas, progreso global y progreso por tecnología derivados del historial real', async () => {
    renderDashboard({ progress: [progressOf('arrays', 10, 7), progressOf('functions', 5, 5)], completed: [COMPLETED] });
    const generalProgress = await screen.findByRole('region', { name: 'Progreso general' });
    const technologyProgress = screen.getByRole('region', { name: 'Progreso por tecnología' });
    const technologyCard = within(technologyProgress).getByRole('listitem');
    expect(within(generalProgress).getByText('2 de 2 conceptos practicados')).toBeInTheDocument();
    expect(within(technologyCard).getByRole('heading', { name: 'JavaScript' })).toBeInTheDocument();
    expect(within(technologyCard).getByText('100%')).toBeInTheDocument();
    expect(within(technologyCard).getByText('2 de 2 conceptos')).toBeInTheDocument();
    expect(within(technologyCard).getByText('Precisión')).toBeInTheDocument();
    expect(within(technologyCard).getByText('80%')).toBeInTheDocument();
    expect(within(technologyCard).getByText('Última práctica')).toBeInTheDocument();
    expect(technologyCard.querySelector('time')).toHaveAttribute('datetime', '2026-09-02T10:00:00.000Z');
    expect(within(technologyProgress).getByText('Explora tus avances en cada tecnología.')).toBeInTheDocument();
    expect(screen.getByText('Sesiones recientes')).toBeInTheDocument();
    expect(screen.getByText('Conceptos practicados')).toBeInTheDocument();
    expect(screen.getByText('Tecnologías trabajadas')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Métricas de progreso' }).children).toHaveLength(5);
    expect(screen.getAllByText('80%')).toHaveLength(2);
    expect(screen.getAllByText('1 min 2 s')).toHaveLength(2);
    expect(screen.getByRole('progressbar', { name: 'Conceptos practicados' })).toHaveAttribute('aria-valuetext', '2 de 2 conceptos practicados');
    expect(within(technologyCard).getByRole('progressbar', { name: 'Progreso en JavaScript' })).toHaveAttribute('aria-valuenow', '2');
    expect(within(technologyCard).getByRole('progressbar', { name: 'Progreso en JavaScript' })).toHaveAttribute('aria-valuemax', '2');
    expect(screen.getByRole('link', { name: 'Ver todas las tecnologías' })).toHaveAttribute('href', '/tech');
    expect(within(technologyCard).getByRole('link', { name: 'Ver tecnología' })).toHaveAttribute('href', '/tech/javascript');
  });

  it('no inventa precisión ni última práctica cuando la tecnología no tiene intentos', async () => {
    renderDashboard({ progress: [progressOf('arrays', 0, 0)] });
    const technologyProgress = await screen.findByRole('region', { name: 'Progreso por tecnología' });
    const technologyCard = within(technologyProgress).getByRole('listitem');
    expect(within(technologyCard).getByText('Sin datos')).toBeInTheDocument();
    expect(within(technologyCard).getByText('Sin práctica')).toBeInTheDocument();
    expect(technologyCard.querySelector('time')).toBeNull();
  });

  it('muestra actividad reciente real, ordenada, y enlaza a su resultado', async () => {
    renderDashboard({ progress: [progressOf('arrays', 10, 7)], completed: [COMPLETED] });
    const activity = await screen.findByRole('region', { name: 'Actividad reciente' });
    expect(screen.getByRole('link', { name: 'Ver resultado de la última práctica: Filter no debería mutar' })).toHaveAttribute('href', '/results/arrays-session');
    expect(within(activity).getByText('Tus últimas sesiones de práctica.')).toBeInTheDocument();
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

  it('conserva un único main, headings semánticos y ningún sistema ficticio', async () => {
    const { container } = renderDashboard({ progress: [progressOf('arrays', 10, 7)], completed: [COMPLETED] });
    await screen.findByRole('heading', { name: 'Actividad reciente' });
    expect(screen.getAllByRole('main')).toHaveLength(1);
    expect(screen.getAllByRole('heading', { level: 1, name: 'Progreso' })).toHaveLength(1);
    expect(container).not.toHaveTextContent(/\bXP\b|racha|insignia|nivel|ranking/i);
  });
});
