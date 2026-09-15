import { type ReactNode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { ContentContext } from '@/contexts/content-context';
import { HistoryContext } from '@/contexts/history-context';
import type { Concept, ContentContextValue, Topic } from '@/types/content';
import type { ExerciseSession, ExerciseStep } from '@/types/exercise';
import type { HistoryContextValue } from '@/types/history';
import type { Attempt } from '@/types/progress';
import ReviewPage from './ReviewPage';

const step = (id: string, prompt: string, type: ExerciseStep['type'] = 'code-reading'): ExerciseStep => ({ id, type, prompt, code: 'const value = 1;', language: 'javascript', options: [{ id: `${id}-a`, text: 'undefined' }, { id: `${id}-b`, text: '1' }], requirements: [], hintCount: 0, stepOrder: 1 });
const FIRST = step('step-first', 'Primer prompt');
const SECOND = step('step-second', 'Segundo prompt', 'predict-output');
const SESSION: ExerciseSession = { id: 'session-1', title: 'map frente a forEach', conceptId: 'js-array-iteration', technologyId: 'javascript', difficulty: 'beginner', version: '1', status: 'published', createdAt: '2026-09-01T10:00:00.000Z', updatedAt: null, steps: [FIRST, SECOND] };
const CONCEPT: Concept = { id: 'js-array-iteration', name: 'Iteración', technologyId: 'javascript', topicId: 'arrays', contentMarkdown: '' };
const TOPIC: Topic = { id: 'arrays', name: 'Arrays', technologyId: 'javascript', description: '' };
const attempt = (stepId: string, answer: unknown, isCorrect: boolean): Attempt => ({ id: `attempt-${stepId}`, sessionId: SESSION.id, stepId, stepType: 'code-reading', answer, isCorrect, timeSpentMs: 1_000, hintsUsed: 0, createdAt: '2026-09-03T10:00:00.000Z' });

function deferred<T>() { let resolve: (value: T) => void = () => {}; const promise = new Promise<T>((nextResolve) => { resolve = nextResolve; }); return { promise, resolve }; }

function renderReviewPage({ sessionId = SESSION.id, getSession = vi.fn().mockResolvedValue(SESSION), getAttemptsBySession = vi.fn().mockResolvedValue([attempt(SECOND.id, `${SECOND.id}-b`, false), attempt(FIRST.id, `${FIRST.id}-a`, true)]), getConcept = vi.fn().mockResolvedValue(CONCEPT), getTopics = vi.fn().mockResolvedValue([TOPIC]) }: { sessionId?: string; getSession?: ContentContextValue['getSession']; getAttemptsBySession?: HistoryContextValue['getAttemptsBySession']; getConcept?: ContentContextValue['getConcept']; getTopics?: ContentContextValue['getTopics'] } = {}) {
  const content: ContentContextValue = { technologies: [], getTechnology: vi.fn().mockReturnValue({ id: 'javascript', name: 'JavaScript', icon: 'javascript', description: '' }), getTopics, getConceptsByTopic: vi.fn(), getConcept, getSessionsByConcept: vi.fn(), getSession, isLoading: false };
  const history: HistoryContextValue = { recentCompletedSessions: [], completedSessionsLoading: false, completedSessionsError: null, getCompletedSession: vi.fn(), getAttemptsBySession, attemptsLoading: false, attemptsError: null };
  const wrapper = ({ children }: { children: ReactNode }) => <ContentContext.Provider value={content}><HistoryContext.Provider value={history}><MemoryRouter initialEntries={[`/review/${sessionId}`]}><main><Routes><Route path="/review/:sessionId" element={children} /><Route path="/results/:sessionId" element={<p>Resultado</p>} /><Route path="/practice/:sessionId" element={<p>Práctica</p>} /><Route path="/dashboard" element={<p>Progreso</p>} /></Routes></main></MemoryRouter></HistoryContext.Provider></ContentContext.Provider>;
  return { ...render(<ReviewPage />, { wrapper }), getSession, getAttemptsBySession };
}

describe('ReviewPage', () => {
  it('carga mediante la ruta canónica sin anticipar una sesión inexistente', () => {
    const pending = deferred<ExerciseSession | null>();
    renderReviewPage({ getSession: vi.fn(() => pending.promise) });
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Cargando revisión…');
    expect(screen.getByRole('region')).toHaveAttribute('aria-busy', 'true');
  });

  it('muestra metadata real, breadcrumb y la primera respuesta asociada por stepId', async () => {
    const rendered = renderReviewPage();
    expect(await screen.findByRole('heading', { level: 1, name: 'Revisión de respuestas' })).toBeInTheDocument();
    expect(screen.getByText('JavaScript / Arrays')).toBeInTheDocument();
    expect(screen.getByText('Pregunta 1 de 2')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Primer prompt' })).toBeInTheDocument();
    expect(screen.getAllByText('Respuesta correcta')).not.toHaveLength(0);
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toBeInTheDocument();
    expect(rendered.getSession).toHaveBeenCalledWith(SESSION.id);
    expect(rendered.getAttemptsBySession).toHaveBeenCalledWith(SESSION.id);
  });

  it('navega anterior y siguiente entre steps reales e inhabilita los extremos', async () => {
    renderReviewPage();
    await screen.findByRole('heading', { level: 2, name: 'Primer prompt' });
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(screen.getByRole('heading', { level: 2, name: 'Segundo prompt' })).toBeInTheDocument();
    expect(screen.getAllByText('Respuesta incorrecta')).not.toHaveLength(0);
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Anterior' }));
    expect(screen.getByRole('heading', { level: 2, name: 'Primer prompt' })).toBeInTheDocument();
  });

  it('permite seleccionar un step con el indicador y conserva su estado semántico', async () => {
    renderReviewPage();
    await screen.findByRole('heading', { level: 2, name: 'Primer prompt' });
    fireEvent.click(screen.getByRole('button', { name: 'Ir a la pregunta 2, incorrecta' }));
    expect(screen.getByRole('heading', { level: 2, name: 'Segundo prompt' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ir a la pregunta 2, incorrecta' })).toHaveAttribute('aria-current', 'step');
  });

  it('ofrece rutas reales para volver al resultado y repetir práctica', async () => {
    renderReviewPage();
    await screen.findByRole('heading', { level: 1, name: 'Revisión de respuestas' });
    expect(screen.getByRole('link', { name: 'Volver a resultados' })).toHaveAttribute('href', '/results/session-1');
    expect(screen.getByRole('link', { name: 'Repetir práctica' })).toHaveAttribute('href', '/practice/session-1');
  });

  it('distingue sesión inexistente y no carga attempts', async () => {
    const getAttemptsBySession = vi.fn();
    renderReviewPage({ getSession: vi.fn().mockResolvedValue(null), getAttemptsBySession });
    expect(await screen.findByRole('heading', { level: 1, name: 'Sesión no disponible' })).toBeInTheDocument();
    expect(getAttemptsBySession).not.toHaveBeenCalled();
  });

  it('conserva la sesión si falla la lectura de attempts', async () => {
    renderReviewPage({ getAttemptsBySession: vi.fn().mockRejectedValue(new Error('historial inaccesible')) });
    expect(await screen.findByRole('heading', { level: 1, name: 'Revisión de respuestas' })).toBeInTheDocument();
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar las respuestas registradas. historial inaccesible');
  });

  it('muestra estado vacío sin inventar respuestas y mantiene un único main', async () => {
    renderReviewPage({ getAttemptsBySession: vi.fn().mockResolvedValue([]) });
    expect(await screen.findByText('No hay respuestas registradas para revisar.')).toBeInTheDocument();
    expect(screen.getAllByRole('main')).toHaveLength(1);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
  });
});
