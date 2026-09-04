import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { AppLayout } from './AppLayout';

function renderLayout() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<section><h1>Contenido</h1></section>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('AppLayout responsive móvil (T078)', () => {
  it('prioriza navegación inferior y reserva espacio para ella en móvil', () => {
    const { container } = renderLayout();

    const main = screen.getByRole('main');
    const mobileNav = container.querySelector('nav.sm\\:hidden');
    const topBar = container.querySelector('nav.hidden.sm\\:flex');
    const sidebar = container.querySelector('aside');

    expect(main).toHaveClass('px-4', 'pb-24', 'sm:px-6', 'sm:pb-6');
    expect(mobileNav).toHaveClass('fixed', 'bottom-0', 'sm:hidden');
    expect(topBar).toHaveClass('hidden', 'sm:flex', 'lg:hidden');
    expect(sidebar).toHaveClass('hidden', 'lg:flex');
  });

  it('mantiene el contenedor principal flexible para no desbordar en móvil', () => {
    const { container } = renderLayout();

    expect(container.querySelector('.min-w-0.flex-1')).toBeInTheDocument();
    expect(container.querySelector('h1')).toHaveTextContent('Contenido');
  });

  it('activa sidebar y centra el contenido con ancho acotado en desktop', () => {
    const { container } = renderLayout();

    expect(container.firstElementChild).toHaveClass('lg:flex');
    expect(container.querySelector('aside')).toHaveClass('lg:flex', 'w-64');
    expect(container.querySelector('.min-w-0.flex-1')).toHaveClass('lg:flex', 'lg:justify-center');
    expect(container.querySelector('.w-full.flex.flex-col')).toHaveClass('lg:max-w-[900px]');
  });
});
