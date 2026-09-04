import { type ReactNode } from 'react';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { ContentContext } from '@/contexts/content-context';
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
    getTopics: vi.fn(),
    getConceptsByTopic: vi.fn(),
    getConcept: vi.fn(),
    getSessionsByConcept: vi.fn(),
    getSession: vi.fn(),
  };
  const wrapper = ({ children }: { children: ReactNode }) => (
    <ContentContext.Provider value={content}>
      <MemoryRouter>
        <main>{children}</main>
      </MemoryRouter>
    </ContentContext.Provider>
  );

  return render(<HomePage />, { wrapper });
}

describe('HomePage (T054)', () => {
  it('presenta CodeGym y lleva el CTA a la sección de tecnologías', () => {
    renderHome({ technologies: [JAVASCRIPT] });

    expect(
      screen.getByRole('heading', { level: 1, name: 'CodeGym' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Practica JavaScript entendiendo el código, no memorizándolo.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Sesiones cortas y enfocadas para entrenar conceptos/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Empezar a practicar' }),
    ).toHaveAttribute('href', '#technologies');
  });

  it('mantiene el Hero visible y anuncia la carga de tecnologías', () => {
    renderHome({ isLoading: true });

    expect(screen.getByRole('heading', { name: 'CodeGym' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Cargando tecnologías…',
    );
    expect(
      within(
        screen.getByRole('region', { name: 'Tecnologías disponibles' }),
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
        screen.getByRole('region', { name: 'Tecnologías disponibles' }),
      ).queryByRole('link'),
    ).toBeNull();
  });

  it('representa cada tecnología como un enlace construido desde su id', () => {
    renderHome({ technologies: [JAVASCRIPT, TYPESCRIPT] });

    const section = screen.getByRole('region', {
      name: 'Tecnologías disponibles',
    });
    expect(within(section).getByText('JavaScript')).toBeInTheDocument();
    expect(
      within(section).getByText('TypeScript para aplicaciones de gran escala'),
    ).toBeInTheDocument();
    expect(within(section).getByText('El lenguaje de la web.')).toBeInTheDocument();
    expect(
      within(section).getByText(/JavaScript con tipos para construir aplicaciones/),
    ).toBeInTheDocument();

    const technologyLinks = within(section).getAllByRole('link');
    expect(technologyLinks).toHaveLength(2);
    expect(technologyLinks[0]).toHaveAttribute('href', '/tech/javascript');
    expect(technologyLinks[1]).toHaveAttribute('href', '/tech/typescript');

    expect(section.querySelector('ul')).toHaveClass('grid', 'sm:grid-cols-2');
  });

  it('conserva un único main y una jerarquía de headings significativa', () => {
    renderHome({ technologies: [JAVASCRIPT] });

    expect(screen.getAllByRole('main')).toHaveLength(1);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(
      screen.getByRole('heading', { level: 2, name: 'Tecnologías disponibles' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('region', { name: 'Tecnologías disponibles' }),
    ).toHaveAttribute('id', 'technologies');
  });
});
