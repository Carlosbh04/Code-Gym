import { act, render, screen } from '@testing-library/react';
import { RouterProvider } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { router } from './router';

vi.mock('@/features/home/HomePage', () => ({
  default: () => <p data-testid="route-view">Inicio</p>,
}));
vi.mock('@/features/onboarding/OnboardingPage', () => ({
  default: () => <p data-testid="route-view">Onboarding</p>,
}));
vi.mock('@/features/dashboard/DashboardPage', () => ({
  default: () => <p data-testid="route-view">Dashboard</p>,
}));
vi.mock('@/features/practice/TechnologyPage', () => ({
  default: () => <p data-testid="route-view">Tecnología</p>,
}));
vi.mock('@/features/practice/TopicPage', () => ({
  default: () => <p data-testid="route-view">Tema</p>,
}));
vi.mock('@/features/session/SessionPage', () => ({
  default: () => <p data-testid="route-view">Sesión</p>,
}));
vi.mock('@/features/review/ReviewPage', () => ({
  default: () => <p data-testid="route-view">Revisión</p>,
}));
vi.mock('@/features/results/ResultsPage', () => ({
  default: () => <p data-testid="route-view">Resultados</p>,
}));

async function navigate(path: string) {
  await act(async () => {
    await router.navigate(path);
  });
}

describe('router', () => {
  afterEach(async () => {
    await navigate('/');
  });

  it('envía una ruta no reconocida a NotFoundPage sin redirigirla', async () => {
    render(<RouterProvider router={router} />);

    await navigate('/ruta-desconocida');

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Página no encontrada',
      }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/ruta-desconocida');
  });

  it('mantiene las rutas conocidas y sus parámetros fuera de la wildcard', async () => {
    render(<RouterProvider router={router} />);

    for (const [path, expected] of [
      ['/', 'Inicio'],
      ['/onboarding', 'Onboarding'],
      ['/dashboard', 'Dashboard'],
      ['/tech/javascript', 'Tecnología'],
      ['/tech/javascript/arrays', 'Tema'],
      ['/practice/session-1', 'Sesión'],
      ['/review/session-1', 'Revisión'],
      ['/results/session-1', 'Resultados'],
      ['/tech/no-existe', 'Tecnología'],
      ['/review/sesion-no-existe', 'Revisión'],
    ]) {
      await navigate(path);

      expect(await screen.findByTestId('route-view')).toHaveTextContent(expected);
      expect(screen.queryByRole('heading', { name: 'Página no encontrada' })).toBeNull();
    }
  });
});
