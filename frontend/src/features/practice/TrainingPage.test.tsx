import { type ReactNode } from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { ContentContext } from '@/contexts/content-context';
import { ProgressContext } from '@/contexts/progress-context';
import type { ContentContextValue, Concept, Technology, Topic } from '@/types/content';
import type { ConceptProgress, ProgressContextValue } from '@/types/progress';

vi.mock('@/components/codegym/PageLoadTransition', () => ({
  PageLoadTransition: ({
    loading,
    skeleton,
    children,
  }: {
    loading: boolean;
    skeleton: ReactNode;
    children: ReactNode;
  }) => (
    <>
      {loading ? skeleton : children}
    </>
  ),
}));

import TrainingPage from './TrainingPage';

const TECHNOLOGIES: Technology[] = [
  { id: 'javascript', name: 'JavaScript', icon: 'JS', description: 'El lenguaje de la web.' },
  { id: 'html', name: 'HTML', icon: 'HTML', description: 'Estructura semántica.' },
  { id: 'css', name: 'CSS', icon: 'CSS', description: 'Estilos y layouts.' },
  { id: 'react', name: 'React', icon: 'R', description: 'Interfaces por componentes.' },
  { id: 'nodejs', name: 'Node.js', icon: 'N', description: 'JavaScript en el servidor.' },
  { id: 'sql', name: 'SQL', icon: 'SQL', description: 'Consultas sobre datos.' },
];
const topics = new Map<string, Topic[]>(TECHNOLOGIES.map((technology, index) => [
  technology.id,
  Array.from({ length: index + 1 }, (_, topicIndex) => ({
    id: `${technology.id}-topic-${topicIndex}`,
    name: `${technology.name} tema ${topicIndex + 1}`,
    technologyId: technology.id,
    description: '',
  })),
]));
const concepts = new Map<string, Concept[]>(
  [...topics.values()].flat().map((topic) => [topic.id, [{
    id: `${topic.id}-concept`,
    name: `${topic.name} concepto`,
    topicId: topic.id,
    technologyId: topic.technologyId,
    contentMarkdown: '',
  }]]),
);
const JAVASCRIPT_PROGRESS: ConceptProgress = {
  conceptId: 'javascript-topic-0-concept',
  domain: 0,
  totalAttempts: 4,
  correctAttempts: 3,
  difficultyDistribution: {
    beginner: { total: 4, correct: 3 },
    intermediate: { total: 0, correct: 0 },
    advanced: { total: 0, correct: 0 },
  },
  recentErrors: [],
  lastPracticed: '2026-09-06T10:00:00.000Z',
  schemaVersion: 1,
};

function renderTraining({
  isLoading = false,
  progress = new Map(),
  getTopics = vi.fn(async (technologyId: string) => topics.get(technologyId) ?? []),
}: {
  isLoading?: boolean;
  progress?: Map<string, ConceptProgress>;
  getTopics?: ContentContextValue['getTopics'];
} = {}) {
  const content: ContentContextValue = {
    technologies: TECHNOLOGIES,
    isLoading,
    getTechnology: vi.fn(),
    getTopics,
    getConceptsByTopic: vi.fn(async (topicId) => concepts.get(topicId) ?? []),
    getConcept: vi.fn(),
    getSessionsByConcept: vi.fn(),
    getSession: vi.fn(),
  };
  const progressValue: ProgressContextValue = {
    progress,
    updateProgress: vi.fn(),
    getConceptDomain: vi.fn(),
    isLoading: false,
    error: null,
  };
  const wrapper = ({ children }: { children: ReactNode }) => (
    <ContentContext.Provider value={content}>
      <ProgressContext.Provider value={progressValue}>
        <MemoryRouter>{children}</MemoryRouter>
      </ProgressContext.Provider>
    </ContentContext.Provider>
  );
  return render(<TrainingPage />, { wrapper });
}

describe('TrainingPage', () => {
  it('agrupa las seis tecnologías con conteos y enlaces canónicos', async () => {
    renderTraining();

    expect(screen.getByRole('heading', { level: 1, name: 'Entrenar' })).toBeInTheDocument();
    expect(screen.queryByText('Catálogo de práctica')).not.toBeInTheDocument();
    const web = await screen.findByRole('region', { name: 'Tecnologías de desarrollo web' });
    const advanced = screen.getByRole('region', { name: 'Tecnologías avanzadas' });
    expect(within(web).getAllByRole('link')).toHaveLength(3);
    expect(within(advanced).getAllByRole('link')).toHaveLength(3);
    for (const technology of TECHNOLOGIES) {
      const link = screen.getByRole('link', { name: new RegExp(`^${technology.name}\\s`) });
      expect(link).toHaveAttribute('href', `/tech/${technology.id}`);
      const topicCount = topics.get(technology.id)?.length ?? 0;
      expect(link).toHaveTextContent(`${topicCount} ${topicCount === 1 ? 'tema' : 'temas'}`);
    }
    expect(screen.getByRole('link', { name: 'Ver mi progreso' })).toHaveAttribute('href', '/dashboard');
  });

  it('deriva Continuar y el porcentaje desde progreso real, y Entrenar cuando no hay actividad', async () => {
    renderTraining({ progress: new Map([[JAVASCRIPT_PROGRESS.conceptId, JAVASCRIPT_PROGRESS]]) });

    const javascript = await screen.findByRole('link', { name: /^JavaScript\s/ });
    const html = screen.getByRole('link', { name: /^HTML\s/ });
    expect(javascript).toHaveTextContent('Continuar');
    expect(within(javascript).getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');
    expect(html).toHaveTextContent('Entrenar');
    expect(within(html).getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  });

  it('mantiene un loading sin cards ficticias', () => {
    renderTraining({ isLoading: true });

    expect(screen.getByRole('status')).toHaveTextContent('Cargando catálogo de tecnologías…');
    expect(screen.queryByRole('link', { name: /^JavaScript\s/ })).not.toBeInTheDocument();
  });

  it('muestra un error real cuando falla la carga del catálogo', async () => {
    renderTraining({ getTopics: vi.fn().mockRejectedValue(new Error('Catálogo no disponible')) });

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Catálogo no disponible'));
    expect(screen.queryByRole('link', { name: /^JavaScript\s/ })).not.toBeInTheDocument();
  });
});
