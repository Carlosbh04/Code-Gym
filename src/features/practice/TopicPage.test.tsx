import { type ReactNode } from 'react';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { ContentContext } from '@/contexts/content-context';
import { ProgressContext } from '@/contexts/progress-context';
import type { Concept, ContentContextValue, Technology, Topic } from '@/types/content';
import type { ExerciseSession } from '@/types/exercise';
import type { ConceptProgress, ProgressContextValue } from '@/types/progress';
import TopicPage from './TopicPage';

const JAVASCRIPT: Technology = {
  id: 'javascript',
  name: 'JavaScript',
  icon: 'js',
  description: 'El lenguaje de la web.',
};

const ARRAYS: Topic = {
  id: 'arrays',
  name: 'Arrays',
  technologyId: 'javascript',
  description: 'Métodos de iteración y colecciones.',
};

const FUNCTIONS: Topic = {
  id: 'functions',
  name: 'Functions',
  technologyId: 'javascript',
  description: 'Parámetros, ámbito y retorno.',
};

const CONCEPTS: Concept[] = [
  {
    id: 'array-iteration',
    name: 'Métodos de iteración de arrays',
    topicId: ARRAYS.id,
    technologyId: 'javascript',
    contentMarkdown: '# Iteración',
  },
  {
    id: 'array-mutation',
    name: 'Mutación de arrays',
    topicId: ARRAYS.id,
    technologyId: 'javascript',
    contentMarkdown: '# Mutación',
  },
];

const ARRAY_SESSION: ExerciseSession = {
  id: 'arrays-01', title: 'Practica iteración', conceptId: 'array-iteration',
  technologyId: 'javascript', difficulty: 'beginner', version: '1.0.0',
  status: 'published', createdAt: '2026-09-01', updatedAt: null, steps: [],
};

function renderTopicPage({
  technologyId = 'javascript',
  topicId = 'arrays',
  technologies = [JAVASCRIPT],
  isLoading = false,
  getTopics = vi.fn().mockResolvedValue([ARRAYS, FUNCTIONS]),
  getConceptsByTopic = vi.fn().mockResolvedValue(CONCEPTS),
  getSessionsByConcept = vi.fn().mockResolvedValue([]),
  progress = new Map<string, ConceptProgress>(),
}: {
  technologyId?: string;
  topicId?: string;
  technologies?: Technology[];
  isLoading?: boolean;
  getTopics?: ContentContextValue['getTopics'];
  getConceptsByTopic?: ContentContextValue['getConceptsByTopic'];
  getSessionsByConcept?: ContentContextValue['getSessionsByConcept'];
  progress?: Map<string, ConceptProgress>;
} = {}) {
  const content: ContentContextValue = {
    technologies,
    isLoading,
    getTechnology: (id) => technologies.find((technology) => technology.id === id),
    getTopics,
    getConceptsByTopic,
    getConcept: vi.fn(),
    getSessionsByConcept,
    getSession: vi.fn(),
  };
  const progressValue: ProgressContextValue = {
    progress,
    updateProgress: vi.fn(),
    getConceptDomain: (conceptId) => progress.get(conceptId)?.domain ?? 0,
    isLoading: false,
    error: null,
  };
  const wrapper = ({ children }: { children: ReactNode }) => (
    <ProgressContext.Provider value={progressValue}>
      <ContentContext.Provider value={content}>
        <MemoryRouter initialEntries={[`/tech/${technologyId}/${topicId}`]}>
          <main>
            <Routes>
              <Route path="/tech/:technologyId/:topicId" element={children} />
            </Routes>
          </main>
        </MemoryRouter>
      </ContentContext.Provider>
    </ProgressContext.Provider>
  );

  return { ...render(<TopicPage />, { wrapper }), content };
}

describe('TopicPage (T057)', () => {
  it('anuncia la carga inicial sin mostrar recursos inexistentes', () => {
    const getTopics = vi.fn();
    const getConceptsByTopic = vi.fn();
    renderTopicPage({
      isLoading: true,
      technologies: [],
      getTopics,
      getConceptsByTopic,
    });

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Cargando tema…',
    );
    expect(screen.getByRole('region')).toHaveAttribute('aria-busy', 'true');
    expect(screen.queryByText('Tecnología no disponible')).not.toBeInTheDocument();
    expect(screen.queryByText('Tema no disponible')).not.toBeInTheDocument();
    expect(getTopics).not.toHaveBeenCalled();
    expect(getConceptsByTopic).not.toHaveBeenCalled();
  });

  it('muestra el topic y los conceptos reales en el orden entregado', async () => {
    renderTopicPage();

    expect(await screen.findByRole('heading', { level: 1, name: 'Arrays' })).toBeInTheDocument();
    await screen.findByRole('heading', { level: 3, name: 'Métodos de iteración de arrays' });
    expect(screen.getByText('Métodos de iteración y colecciones.')).toBeInTheDocument();
    expect(screen.getByText('# Iteración')).toBeInTheDocument();
    const concepts = screen.getByRole('region', { name: 'Teoría y conceptos' });
    expect(within(concepts).getByRole('heading', { level: 2, name: 'Teoría y conceptos' })).toBeInTheDocument();
    expect(within(concepts).getAllByRole('heading', { level: 3 }).map((item) => item.textContent)).toEqual([
      'Métodos de iteración de arrays', 'Mutación de arrays',
    ]);
  });

  it('muestra una tecnología no disponible sin consultar topics ni conceptos', () => {
    const getTopics = vi.fn();
    const getConceptsByTopic = vi.fn();
    renderTopicPage({
      technologyId: 'no-existe',
      getTopics,
      getConceptsByTopic,
    });

    expect(
      screen.getByRole('heading', { level: 1, name: 'Tecnología no disponible' }),
    ).toBeInTheDocument();
    expect(getTopics).not.toHaveBeenCalled();
    expect(getConceptsByTopic).not.toHaveBeenCalled();
  });

  it('distingue un topic inexistente y permite volver a su tecnología', async () => {
    const getConceptsByTopic = vi.fn();
    renderTopicPage({ topicId: 'no-existe', getConceptsByTopic });

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Tema no disponible' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Volver a JavaScript' })).toHaveAttribute(
      'href',
      '/tech/javascript',
    );
    expect(getConceptsByTopic).not.toHaveBeenCalled();
  });

  it('muestra un empty state de conceptos sin tratarlo como recurso inexistente', async () => {
    renderTopicPage({ getConceptsByTopic: vi.fn().mockResolvedValue([]) });

    expect(
      await screen.findByRole('heading', {
        level: 3,
        name: 'Todavía no hay conceptos disponibles',
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Arrays' })).toBeInTheDocument();
    expect(screen.queryByText('Tema no disponible')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('representa un error de conceptos sin convertirlo en una lista vacía', async () => {
    renderTopicPage({
      getConceptsByTopic: vi.fn().mockRejectedValue(new Error('índice inaccesible')),
    });

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No pudimos cargar los conceptos de este tema. índice inaccesible',
    );
    expect(
      screen.queryByRole('heading', {
        level: 3,
        name: 'Todavía no hay conceptos disponibles',
      }),
    ).not.toBeInTheDocument();
  });

  it('deriva las sesiones de cada concepto y enlaza a la práctica real', async () => {
    const getSessionsByConcept = vi.fn().mockImplementation((conceptId: string) =>
      Promise.resolve(conceptId === 'array-iteration' ? [ARRAY_SESSION] : []),
    );
    const rendered = renderTopicPage({ getSessionsByConcept });

    expect(await screen.findByRole('link', { name: /Practica iteración.*Empezar práctica/i })).toHaveAttribute(
      'href', '/practice/arrays-01',
    );
    expect(rendered.content.getSessionsByConcept).toHaveBeenCalledWith('array-iteration');
    expect(rendered.content.getSession).not.toHaveBeenCalled();
    expect(rendered.content.getConcept).not.toHaveBeenCalled();
  });

  it('muestra el breadcrumb real y progreso únicamente cuando existe actividad', async () => {
    renderTopicPage({
      progress: new Map([
        ['array-iteration', {
          conceptId: 'array-iteration', domain: 0.5, totalAttempts: 3, correctAttempts: 2,
          difficultyDistribution: { beginner: { total: 3, correct: 2 }, intermediate: { total: 0, correct: 0 }, advanced: { total: 0, correct: 0 } },
          recentErrors: [], lastPracticed: '2026-09-04', schemaVersion: 1,
        }],
      ]),
    });

    await screen.findByRole('heading', { level: 1, name: 'Arrays' });
    await screen.findByText('# Iteración');
    expect(screen.getByRole('link', { name: 'Entrenar' })).toHaveAttribute('href', '/#technologies');
    expect(screen.getByRole('link', { name: 'JavaScript' })).toHaveAttribute('href', '/tech/javascript');
    expect(screen.getByLabelText('Progreso del tema')).toHaveTextContent('1 de 2 conceptos practicados');
    expect(screen.getByRole('progressbar', { name: 'Progreso en Arrays' })).toHaveAttribute(
      'aria-valuetext',
      '1 de 2 conceptos practicados',
    );
  });

  it('mantiene un único main, headings consecutivos y lista semántica', async () => {
    renderTopicPage();

    await screen.findByRole('heading', { level: 3, name: 'Métodos de iteración de arrays' });
    expect(screen.getAllByRole('main')).toHaveLength(1);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    const concepts = screen.getByRole('region', { name: 'Teoría y conceptos' });
    expect(within(concepts).getByRole('list')).toBeInTheDocument();
    expect(within(concepts).getAllByRole('listitem')).toHaveLength(2);
  });
});
