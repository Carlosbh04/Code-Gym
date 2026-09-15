import { render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import NotFoundPage from './NotFoundPage';

function renderNotFound() {
  return render(
    <MemoryRouter initialEntries={['/ruta-desconocida']}>
      <main>
        <NotFoundPage />
        <Location />
      </main>
    </MemoryRouter>,
  );
}

function Location() {
  const { pathname } = useLocation();

  return <output data-testid="location">{pathname}</output>;
}

describe('NotFoundPage (T061)', () => {
  it('explica el error y ofrece una vuelta explícita al inicio', () => {
    renderNotFound();

    expect(
      screen.getByRole('heading', { level: 1, name: 'Página no encontrada' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/No encontramos la página que buscabas/i),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Volver al inicio' })).toHaveAttribute(
      'href',
      '/',
    );
  });

  it('no introduce un segundo main ni redirige automáticamente', () => {
    renderNotFound();

    expect(screen.getAllByRole('main')).toHaveLength(1);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByTestId('location')).toHaveTextContent('/ruta-desconocida');
  });
});
