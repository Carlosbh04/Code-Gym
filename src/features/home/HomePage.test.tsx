import { type ReactNode } from 'react';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { ContentContext } from '@/contexts/content-context';
import { HistoryContext } from '@/contexts/history-context';
import { ProgressContext } from '@/contexts/progress-context';
import type { ContentContextValue, Technology } from '@/types/content';
import HomePage from './HomePage';

const JAVASCRIPT: Technology = {
  id: 'javascript',
  name: 'JavaScript',
  icon: 'js',
  description: 'El lenguaje de la web.',
};

const TYPESCRIPT: Technology = {
  id: 'typescript',
  name: 'TypeScript para aplicaciones de gran escala',
  icon: 'ts',
  description:
    'JavaScript con tipos para construir aplicaciones mantenibles y seguras.',
};

function renderHome({
  technologies = [],
  isLoading = false,
}: {
  technologies?: Technology[];
  isLoading?: boolean;
} = {}) {
  const content: ContentContextValue = {
    technologies,
    isLoading,
    getTechnology: vi.fn(),
    getTopics: vi.fn().mockResolvedValue([]),
    getConceptsByTopic: vi.fn().mockResolvedValue([]),
    getConcept: vi.fn(),
    getSessionsByConcept: vi.fn().mockResolvedValue([]),
    getSession: vi.fn(),
  };
  const wrapper = ({ children }: { children: ReactNode }) => (
    <ContentContext.Provider value={content}>
      <HistoryContext.Provider value={{ recentCompletedSessions: [], completedSessionsLoading: false, completedSessionsError: null, getCompletedSession: vi.fn(), getAttemptsBySession: vi.fn(), attemptsLoading: false, attemptsError: null }}>
        <ProgressContext.Provider value={{ progress: new Map(), updateProgress: vi.fn(), getConceptDomain: vi.fn(), isLoading: false, error: null }}>
          <MemoryRouter><main>{children}</main></MemoryRouter>
        </ProgressContext.Provider>
      </HistoryContext.Provider>
    </ContentContext.Provider>
  );

  return render(<HomePage />, { wrapper });
}

describe('HomePage (T054)', () => {
  it('presenta el saludo y un CTA hacia una práctica real', () => {
    renderHome({ technologies: [JAVASCRIPT] });

    expect(
      screen.getByRole('heading', { level: 1, name: 'Hola, Carlos' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Sigue practicando. La constancia te lleva lejos.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Empieza tu próxima sesión'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Explorar JavaScript' }),
    ).toHaveAttribute('href', '/tech/javascript');
  });

  it('mantiene el saludo visible y anuncia la carga de tecnologías', () => {
    renderHome({ isLoading: true });

    expect(screen.getByRole('heading', { name: 'Hola, Carlos' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Cargando tecnologías…',
    );
    expect(
      within(
        screen.getByRole('region', { name: 'Tecnologías' }),
      ).queryByRole('link'),
    ).toBeNull();
  });

  it('muestra un estado vacío sin inventar tecnologías', () => {
    renderHome();

    expect(screen.getByRole('status')).toHaveTextContent(
      'No hay tecnologías disponibles',
    );
    expect(
      within(
        screen.getByRole('region', { name: 'Tecnologías' }),
      ).queryByRole('link'),
    ).toBeNull();
  });

  it('representa cada tecnología como un enlace construido desde su id', () => {
    renderHome({ technologies: [JAVASCRIPT, TYPESCRIPT] });

    const section = screen.getByRole('region', {
      name: 'Tecnologías',
    });
    expect(within(section).getByText('JavaScript')).toBeInTheDocument();
    expect(
      within(section).getByText('TypeScript para aplicaciones de gran escala'),
    ).toBeInTheDocument();

    const technologyLinks = within(section).getAllByRole('link');
    expect(technologyLinks).toHaveLength(2);
    expect(technologyLinks[0]).toHaveAttribute('href', '/tech/javascript');
    expect(technologyLinks[1]).toHaveAttribute('href', '/tech/typescript');

    expect(section.querySelector('ul')).toHaveClass('grid', 'grid-cols-2', 'md:grid-cols-3');
  });

  it('conserva un único main y una jerarquía de headings significativa', () => {
    renderHome({ technologies: [JAVASCRIPT] });

    expect(screen.getAllByRole('main')).toHaveLength(1);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(
      screen.getByRole('heading', { level: 2, name: 'Tecnologías' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('region', { name: 'Tecnologías' }),
    ).toHaveAttribute('id', 'technologies');
  });
});
