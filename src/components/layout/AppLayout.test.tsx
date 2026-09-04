import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { AppLayout } from './AppLayout';

function renderLayout() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route element={<AppLayout />}>
        <Route path="/" element={<section><h1>Contenido</h1></section>} />
        <Route path="/dashboard" element={<section><h1>Progreso</h1></section>} />
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
    const topBar = container.querySelector('header.hidden.sm\\:flex');
    const sidebar = container.querySelector('aside');

    expect(main).toHaveClass('px-4', 'pb-28', 'sm:px-6', 'sm:pb-8');
    expect(mobileNav).toHaveClass('fixed', 'bottom-3', 'sm:hidden');
    expect(topBar).toHaveClass('hidden', 'sm:flex');
    expect(sidebar).toHaveClass('hidden', 'sm:flex', 'sm:w-20', 'lg:w-64');
    expect(sidebar).toHaveAccessibleName('Barra lateral');
  });

  it('mantiene el contenedor principal flexible para no desbordar en móvil', () => {
    const { container } = renderLayout();

    expect(container.querySelector('.min-w-0.flex-1')).toBeInTheDocument();
    expect(container.querySelector('h1')).toHaveTextContent('Contenido');
  });

  it('ofrece un salto de teclado al contenido principal', () => {
    renderLayout();

    expect(screen.getByRole('link', { name: 'Saltar al contenido principal' })).toHaveAttribute(
      'href',
      '#main-content',
    );
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content');
    expect(screen.getByRole('main')).toHaveAttribute('tabindex', '-1');
  });

  it('mueve el foco al contenido principal después de navegar', async () => {
    renderLayout();

    fireEvent.click(screen.getAllByRole('link', { name: 'Progreso' })[0]);

    expect(await screen.findByRole('heading', { name: 'Progreso' })).toBeInTheDocument();
    expect(document.activeElement).toBe(screen.getByRole('main'));
  });

  it('activa sidebar y centra el contenido con ancho acotado en desktop', () => {
    const { container } = renderLayout();

    expect(container.querySelector('.min-h-screen.sm\\:flex')).toBeInTheDocument();
    expect(container.querySelector('aside')).toHaveClass('sm:flex', 'sm:w-20', 'lg:w-64');
    expect(container.querySelector('.min-w-0.flex-1')).toBeInTheDocument();
    expect(container.querySelector('div[class*="max-w-"]')).toHaveClass('max-w-[1440px]');
  });
});
