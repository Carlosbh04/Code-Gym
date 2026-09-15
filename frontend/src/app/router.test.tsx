import { act, render, screen } from '@testing-library/react';
import { RouterProvider } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ThemeProvider } from '@/contexts/ThemeContext';

const authState = vi.hoisted(() => ({ authenticated: true }));

vi.mock('@/features/auth/AuthContext', () => ({
  useAuth: () => ({
    user: authState.authenticated ? {
      id: 'user-test',
      email: 'test@example.com',
      displayName: 'Test',
      role: 'USER',
      createdAt: '2026-09-13T08:00:00.000Z',
      updatedAt: '2026-09-13T08:00:00.000Z',
    } : null,
    accessToken: authState.authenticated ? 'access-token-test' : null,
    status: authState.authenticated ? 'authenticated' : 'unauthenticated',
    isAuthenticated: authState.authenticated,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
  }),
}));

import { router } from './router';

vi.mock('@/features/home/HomePage', () => ({
  default: () => <p data-testid="route-view">Inicio</p>,
}));
vi.mock('@/features/auth/AuthPage', () => ({
  default: ({ initialMode = 'login' }: { initialMode?: string }) => (
    <p data-testid="route-view">Auth {initialMode}</p>
  ),
}));
vi.mock('@/features/auth/ForgotPasswordPage', () => ({
  default: () => <p data-testid="route-view">Recuperar contraseña</p>,
}));
vi.mock('@/features/onboarding/OnboardingPage', () => ({
  default: () => <p data-testid="route-view">Onboarding</p>,
}));
vi.mock('@/features/dashboard/DashboardPage', () => ({
  default: () => <p data-testid="route-view">Dashboard</p>,
}));
vi.mock('@/features/profile/ProfilePage', () => ({
  default: () => <p data-testid="route-view">Perfil</p>,
}));
vi.mock('@/features/settings/SecurityPage', () => ({
  default: () => <p data-testid="route-view">Seguridad</p>,
}));
vi.mock('@/features/practice/TrainingPage', () => ({
  default: () => <p data-testid="route-view">Training</p>,
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
vi.mock('@/features/review/ReviewHubPage', () => ({
  default: () => <p data-testid="route-view">Repasar</p>,
}));
vi.mock('@/features/results/ResultsPage', () => ({
  default: () => <p data-testid="route-view">Resultados</p>,
}));

async function navigate(path: string) {
  await act(async () => {
    await router.navigate(path);
  });
}

function renderRouter() {
  return render(
    <ThemeProvider>
      <RouterProvider router={router} />
    </ThemeProvider>,
  );
}

describe('router', () => {
  afterEach(async () => {
    authState.authenticated = true;
    await navigate('/');
  });

  it('envía una ruta no reconocida a NotFoundPage sin redirigirla', async () => {
    renderRouter();

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
    renderRouter();

    for (const [path, expected] of [
      ['/', 'Inicio'],
      ['/auth', 'Auth login'],
      ['/login', 'Auth login'],
      ['/register', 'Auth register'],
      ['/forgot-password', 'Recuperar contraseña'],
      ['/onboarding', 'Onboarding'],
      ['/dashboard', 'Dashboard'],
      ['/profile', 'Perfil'],
      ['/settings/security', 'Seguridad'],
      ['/tech', 'Training'],
      ['/tech/javascript', 'Tecnología'],
      ['/tech/javascript/arrays', 'Tema'],
      ['/practice/session-1', 'Sesión'],
      ['/review', 'Repasar'],
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

  it('protege /profile con el RequireAuth existente', async () => {
    authState.authenticated = false;
    renderRouter();

    await navigate('/profile');

    expect(await screen.findByTestId('route-view')).toHaveTextContent('Auth login');
    expect(router.state.location.pathname).toBe('/login');
  });

  it('protege la Home raíz con el RequireAuth existente', async () => {
    authState.authenticated = false;
    renderRouter();

    await navigate('/');

    expect(await screen.findByTestId('route-view')).toHaveTextContent('Auth login');
    expect(router.state.location.pathname).toBe('/login');
  });

  it('protege /settings/security con el RequireAuth existente', async () => {
    authState.authenticated = false;
    renderRouter();

    await navigate('/settings/security');

    expect(await screen.findByTestId('route-view')).toHaveTextContent('Auth login');
    expect(router.state.location.pathname).toBe('/login');
  });

  it('mantiene /forgot-password pública para usuarios sin sesión', async () => {
    authState.authenticated = false;
    renderRouter();

    await navigate('/forgot-password');

    expect(await screen.findByTestId('route-view')).toHaveTextContent('Recuperar contraseña');
    expect(router.state.location.pathname).toBe('/forgot-password');
  });
});
