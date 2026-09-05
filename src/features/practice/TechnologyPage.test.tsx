import { type ReactNode } from 'react';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { ContentContext } from '@/contexts/content-context';
import { ProgressContext } from '@/contexts/progress-context';
import type { ContentContextValue, Technology, Topic } from '@/types/content';
import TechnologyPage from './TechnologyPage';

const JAVASCRIPT: Technology = {
  id: 'javascript',
  name: 'JavaScript',
  icon: 'js',
  description: 'El lenguaje de la web.',
};

const HTML: Technology = {
  id: 'html',
  name: 'HTML',
  icon: 'html',
  description: 'Estructura documentos accesibles.',
};

const TOPICS: Topic[] = [
  {
    id: 'arrays',
    name: 'Arrays',
    technologyId: 'javascript',
    description: 'Trabaja con colecciones y métodos de iteración.',
  },
  {
    id: 'functions',
    name: 'Functions',
    technologyId: 'javascript',
    description: 'Practica parámetros, ámbito y retorno.',
  },
];

function renderTechnologyPage({
  technologyId = 'javascript',
  technologies = [JAVASCRIPT],
  isLoading = false,
  getTopics = vi.fn().mockResolvedValue(TOPICS),
}: {
  technologyId?: string;
  technologies?: Technology[];
  isLoading?: boolean;
  getTopics?: ContentContextValue['getTopics'];
} = {}) {
  const content: ContentContextValue = {
    technologies,
    isLoading,
    getTechnology: (id) => technologies.find((technology) => technology.id === id),
    getTopics,
    getConceptsByTopic: vi.fn().mockResolvedValue([]),
    getConcept: vi.fn(),
    getSessionsByConcept: vi.fn().mockResolvedValue([]),
    getSession: vi.fn(),
  };
  const wrapper = ({ children }: { children: ReactNode }) => (
    <ContentContext.Provider value={content}>
      <ProgressContext.Provider value={{ progress: new Map(), updateProgress: vi.fn(), getConceptDomain: vi.fn(), isLoading: false, error: null }}>
        <MemoryRouter initialEntries={[`/tech/${technologyId}`]}>
          <main><Routes><Route path="/tech/:technologyId" element={children} /></Routes></main>
        </MemoryRouter>
      </ProgressContext.Provider>
    </ContentContext.Provider>
  );

  return { ...render(<TechnologyPage />, { wrapper }), content };
}

describe('TechnologyPage (T056)', () => {
  it('anuncia la carga inicial sin mostrar un falso recurso no disponible', () => {
    const getTopics = vi.fn();
    renderTechnologyPage({ isLoading: true, technologies: [], getTopics });

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Cargando tecnología…',
    );
    expect(screen.getByRole('region')).toHaveAttribute('aria-busy', 'true');
    expect(screen.queryByText('Tecnología no disponible')).not.toBeInTheDocument();
    expect(getTopics).not.toHaveBeenCalled();
  });

  it('muestra la tecnología y sus topics reales con enlaces a TopicPage', async () => {
    renderTechnologyPage();

    expect(
      await screen.findByRole('heading', { level: 1, name: 'JavaScript' }),
    ).toBeInTheDocument();
    expect(screen.getByText('El lenguaje de la web.')).toBeInTheDocument();
    const topics = screen.getByRole('region', { name: 'Temas de JavaScript' });
    expect(await within(topics).findByText('Arrays')).toBeInTheDocument();
    expect(within(topics).getByText('Trabaja con colecciones y métodos de iteración.')).toBeInTheDocument();
    expect(within(topics).getByRole('link', { name: /Arrays/i })).toHaveAttribute(
      'href',
      '/tech/javascript/arrays',
    );
    expect(within(topics).getByRole('link', { name: /Functions/i })).toHaveAttribute(
      'href',
      '/tech/javascript/functions',
    );
  });

  it('deriva los topics de cualquier tecnología publicada, sin asumir JavaScript', async () => {
    const getTopics = vi.fn().mockResolvedValue([
      {
        id: 'html-document',
        name: 'Estructura de documentos',
        technologyId: 'html',
        description: 'Construye una base válida.',
      },
    ] satisfies Topic[]);

    renderTechnologyPage({ technologyId: 'html', technologies: [JAVASCRIPT, HTML], getTopics });

    expect(await screen.findByRole('heading', { level: 1, name: 'HTML' })).toBeInTheDocument();
    expect(getTopics).toHaveBeenCalledWith('html');
    expect(screen.getByRole('link', { name: /Estructura de documentos/i })).toHaveAttribute(
      'href', '/tech/html/html-document',
    );
  });

  it('muestra un recurso local no disponible y no consulta topics para un id inválido', () => {
    const getTopics = vi.fn();
    renderTechnologyPage({ technologyId: 'no-existe', getTopics });

    expect(
      screen.getByRole('heading', { level: 1, name: 'Tecnología no disponible' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('No hemos encontrado la tecnología solicitada.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Volver a tecnologías' })).toHaveAttribute(
      'href',
      '/#technologies',
    );
    expect(getTopics).not.toHaveBeenCalled();
  });

  it('distingue una tecnología válida sin topics de una tecnología inexistente', async () => {
    renderTechnologyPage({ getTopics: vi.fn().mockResolvedValue([]) });

    expect(
      await screen.findByRole('heading', { level: 3, name: 'Todavía no hay temas disponibles' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'JavaScript' })).toBeInTheDocument();
    expect(screen.queryByText('Tecnología no disponible')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('representa el fallo de topics localmente sin convertirlo en un estado vacío', async () => {
    renderTechnologyPage({
      getTopics: vi.fn().mockRejectedValue(new Error('índice inaccesible')),
    });

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No pudimos cargar los temas de esta tecnología. índice inaccesible',
    );
    expect(
      screen.queryByRole('heading', { level: 3, name: 'Todavía no hay temas disponibles' }),
    ).not.toBeInTheDocument();
  });

  it('deriva métricas desde conceptos y sesiones, sin consultar contenido ajeno', async () => {
    const rendered = renderTechnologyPage();

    await screen.findByRole('link', { name: /Arrays/i });
    await screen.findAllByText('0 ejercicios');
    expect(rendered.content.getConceptsByTopic).toHaveBeenCalledWith('arrays');
    expect(rendered.content.getSessionsByConcept).not.toHaveBeenCalled();
    expect(rendered.content.getConcept).not.toHaveBeenCalled();
    expect(rendered.content.getSession).not.toHaveBeenCalled();
  });

  it('mantiene la semántica de página, lista y enlaces accesibles', async () => {
    renderTechnologyPage();

    await screen.findByRole('link', { name: /Arrays/i });
    expect(screen.getAllByRole('main')).toHaveLength(1);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    const topics = screen.getByRole('region', { name: 'Temas de JavaScript' });
    expect(within(topics).getByRole('list')).toBeInTheDocument();
    expect(within(topics).getAllByRole('listitem')).toHaveLength(2);
    expect(within(topics).getAllByRole('link')).toHaveLength(2);
  });
});
