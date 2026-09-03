import { type ReactNode } from 'react';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { ContentContext } from '@/contexts/content-context';
import type { Concept, ContentContextValue, Technology, Topic } from '@/types/content';
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

function renderTopicPage({
  technologyId = 'javascript',
  topicId = 'arrays',
  technologies = [JAVASCRIPT],
  isLoading = false,
  getTopics = vi.fn().mockResolvedValue([ARRAYS, FUNCTIONS]),
  getConceptsByTopic = vi.fn().mockResolvedValue(CONCEPTS),
}: {
  technologyId?: string;
  topicId?: string;
  technologies?: Technology[];
  isLoading?: boolean;
  getTopics?: ContentContextValue['getTopics'];
  getConceptsByTopic?: ContentContextValue['getConceptsByTopic'];
} = {}) {
  const content: ContentContextValue = {
    technologies,
    isLoading,
    getTechnology: (id) => technologies.find((technology) => technology.id === id),
    getTopics,
    getConceptsByTopic,
    getConcept: vi.fn(),
    getSessionsByConcept: vi.fn(),
    getSession: vi.fn(),
  };
  const wrapper = ({ children }: { children: ReactNode }) => (
    <ContentContext.Provider value={content}>
      <MemoryRouter initialEntries={[`/tech/${technologyId}/${topicId}`]}>
        <main>
          <Routes>
            <Route path="/tech/:technologyId/:topicId" element={children} />
          </Routes>
        </main>
      </MemoryRouter>
    </ContentContext.Provider>
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
    await screen.findByText('Métodos de iteración de arrays');
    expect(screen.getByText('Métodos de iteración y colecciones.')).toBeInTheDocument();
    const concepts = screen.getByRole('region', { name: 'Conceptos' });
    expect(within(concepts).getByRole('heading', { level: 2, name: 'Conceptos' })).toBeInTheDocument();
    expect(within(concepts).getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'Métodos de iteración de arrays',
      'Mutación de arrays',
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

  it('no carga sesiones ni consulta progreso para listar conceptos', async () => {
    const rendered = renderTopicPage();

    await screen.findByText('Métodos de iteración de arrays');
    expect(rendered.content.getSessionsByConcept).not.toHaveBeenCalled();
    expect(rendered.content.getSession).not.toHaveBeenCalled();
    expect(rendered.content.getConcept).not.toHaveBeenCalled();
  });

  it('mantiene un único main, headings consecutivos y lista semántica', async () => {
    renderTopicPage();

    await screen.findByText('Métodos de iteración de arrays');
    expect(screen.getAllByRole('main')).toHaveLength(1);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    const concepts = screen.getByRole('region', { name: 'Conceptos' });
    expect(within(concepts).getByRole('list')).toBeInTheDocument();
    expect(within(concepts).getAllByRole('listitem')).toHaveLength(2);
  });
});
