import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ThemeContext } from '@/contexts/theme-context';
import { LogoutTransitionProvider } from '@/features/logout-transition/LogoutTransitionContext';
import { AppLayout } from './AppLayout';

vi.mock('@/features/auth/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'user-layout',
      email: 'carlos@codegym.dev',
      displayName: 'Carlos',
      role: 'USER',
      createdAt: '2026-09-13T08:00:00.000Z',
      updatedAt: '2026-09-13T08:00:00.000Z',
    },
    logout: vi.fn(),
  }),
}));

function renderLayout(initialEntry = '/') {
  return render(
    <ThemeContext.Provider value={{ preference: 'system', resolvedTheme: 'dark', setPreference: () => undefined }}>
      <LogoutTransitionProvider>
        <MemoryRouter initialEntries={[initialEntry]}>
          <Routes>
            <Route element={<AppLayout />}>
            <Route path="/" element={<section><h1>Contenido</h1></section>} />
            <Route path="/dashboard" element={<section><h1>Progreso</h1></section>} />
            <Route path="/tech" element={<section><h1>Entrenar</h1></section>} />
            <Route path="/tech/:technologyId" element={<section><h1>Tecnología</h1></section>} />
            <Route path="/review" element={<section><h1>Repasar</h1></section>} />
            <Route path="/review/:sessionId" element={<section><h1>Revisión</h1></section>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </LogoutTransitionProvider>
    </ThemeContext.Provider>,
  );
}

describe('AppLayout responsive móvil (T078)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('prioriza navegación inferior y reserva espacio para ella en móvil', () => {
    const { container } = renderLayout();

    const main = screen.getByRole('main');
    const mobileNav = container.querySelector('nav.sm\\:hidden');
    const topBar = screen.getByRole('banner', { name: 'Barra de usuario' });
    const sidebar = container.querySelector('aside');

    expect(main).toHaveClass('px-4', 'pb-28', 'sm:px-6', 'sm:pb-8');
    expect(mobileNav).toHaveClass(
      'fixed',
      'inset-x-0',
      'bottom-0',
      'sm:hidden',
    );
    expect(topBar).toHaveClass('flex', 'h-14', 'sm:h-16');
    expect(within(topBar).queryByRole('navigation')).not.toBeInTheDocument();
    const search = within(topBar).getByRole('search', { name: 'Búsqueda de contenido' });
    expect(within(search).getByRole('combobox', { name: 'Buscar temas, ejercicios o tecnologías' })).toHaveAttribute('aria-expanded', 'false');
    expect(within(search).getByRole('button', { name: 'Abrir búsqueda' })).toBeInTheDocument();
    expect(within(topBar).getByLabelText('Usuario actual: Carlos')).toBeInTheDocument();
    expect(sidebar).toHaveClass('hidden', 'sm:flex', 'sm:w-20', 'xl:w-60');
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

  it('restaura el inicio del documento sin dejar que el foco desplace el shell', async () => {
    const focus = vi.spyOn(HTMLElement.prototype, 'focus');
    renderLayout();
    document.documentElement.scrollTop = 180;
    document.documentElement.scrollLeft = 24;

    fireEvent.click(screen.getAllByRole('link', { name: 'Progreso' })[0]);

    expect(await screen.findByRole('heading', { name: 'Progreso' })).toBeInTheDocument();
    expect(document.documentElement.scrollTop).toBe(0);
    expect(document.documentElement.scrollLeft).toBe(0);
    expect(focus).toHaveBeenLastCalledWith({ preventScroll: true });
  });

  it('activa sidebar y centra el contenido con ancho acotado en desktop', () => {
    const { container } = renderLayout();

    expect(container.querySelector('.min-h-screen.sm\\:flex')).toBeInTheDocument();
    expect(container.querySelector('aside')).toHaveClass(
      'sticky',
      'top-0',
      'h-dvh',
      'self-start',
      'overflow-y-auto',
      'sm:flex',
      'sm:w-20',
      'xl:w-60',
    );
    expect(container.querySelector('.min-w-0.flex-1')).toBeInTheDocument();
    expect(container.querySelector('div[class*="max-w-"]')).toHaveClass('max-w-[1440px]');
    expect(screen.getByRole('banner', { name: 'Barra de usuario' })).toHaveClass('w-full', 'shrink-0');
  });

  it('mantiene Entrenar activo en el catálogo y sus tecnologías', () => {
    const catalog = renderLayout('/tech');
    const sidebar = screen.getByLabelText('Barra lateral');
    const mobileNav = catalog.container.querySelector('nav.sm\\:hidden');
    expect(mobileNav).not.toBeNull();
    const links = [
      sidebar.querySelector('a[href="/tech"]'),
      ...(mobileNav === null ? [] : [mobileNav.querySelector('a[href="/tech"]')]),
    ].filter((link): link is HTMLElement => link !== null);
    expect(links).toHaveLength(2);
    for (const link of links) {
      expect(link).toHaveAttribute('href', '/tech');
      expect(link).toHaveAttribute('aria-current', 'page');
    }
    catalog.unmount();

    renderLayout('/tech/javascript');
    for (const link of screen.getAllByRole('link', { name: /Entrenar/, hidden: true })) {
      expect(link).toHaveAttribute('aria-current', 'page');
    }
  });

  it('presenta el enlace activo como navegación sutil sin borde completo', () => {
    renderLayout('/dashboard');

    const sidebar = screen.getByLabelText('Barra lateral');
    const activeLink = sidebar.querySelector('a[href="/dashboard"]');
    const inactiveLink = sidebar.querySelector('a[href="/"]');

    expect(activeLink).not.toBeNull();
    expect(inactiveLink).not.toBeNull();
    expect(activeLink).toHaveAttribute('aria-current', 'page');
    expect(activeLink).toHaveClass(
      'rounded-lg',
      'bg-primary/[0.08]',
      'text-primary',
      'before:bg-primary',
      'hover:bg-primary/[0.08]',
      'focus-visible:ring-2',
      'focus-visible:ring-ring',
    );
    expect(activeLink).not.toHaveClass('border', 'border-primary/20');
    expect(inactiveLink).toHaveClass(
      'text-muted-foreground',
      'hover:bg-muted/40',
      'hover:text-foreground',
    );
  });

  it('reserva Inicio para la raíz y Progreso para dashboard', () => {
    const home = renderLayout('/');
    const homeSidebar = screen.getByLabelText('Barra lateral');
    expect(homeSidebar.querySelector('a[href="/"]')).toHaveAttribute('aria-current', 'page');
    expect(homeSidebar.querySelector('a[href="/dashboard"]')).not.toHaveAttribute('aria-current');
    home.unmount();

    renderLayout('/dashboard');
    const dashboardSidebar = screen.getByLabelText('Barra lateral');
    expect(dashboardSidebar.querySelector('a[href="/dashboard"]')).toHaveAttribute('aria-current', 'page');
    expect(dashboardSidebar.querySelector('a[href="/"]')).not.toHaveAttribute('aria-current');
  });

  it('reserva TopBar para identidad y conserva navegación en Sidebar y MobileNav', () => {
    const { container } = renderLayout();
    const topBar = screen.getByRole('banner', { name: 'Barra de usuario' });
    expect(within(topBar).queryByRole('link')).not.toBeInTheDocument();
    const search = within(topBar).getByRole('search', { name: 'Búsqueda de contenido' });
    expect(within(search).getByRole('combobox', { name: 'Buscar temas, ejercicios o tecnologías' })).toBeInTheDocument();
    expect(within(topBar).getByText('Carlos')).toBeInTheDocument();

    const sidebar = screen.getByLabelText('Barra lateral');
    expect(within(sidebar).getAllByRole('link')).toHaveLength(4);
    const mobileNav = container.querySelector('nav.sm\\:hidden');
    expect(mobileNav?.querySelectorAll('a')).toHaveLength(4);
  });

  it('mantiene Repasar activo tanto en el hub como en el detalle de revisión', () => {
    const hub = renderLayout('/review');
    for (const link of screen.getAllByRole('link', { name: /Repasar/, hidden: true })) {
      expect(link).toHaveAttribute('aria-current', 'page');
    }
    hub.unmount();

    renderLayout('/review/session-1');
    for (const link of screen.getAllByRole('link', { name: /Repasar/, hidden: true })) {
      expect(link).toHaveAttribute('aria-current', 'page');
    }
  });

  it('no muestra la intro durante una navegación normal', () => {
    renderLayout('/');

    expect(
      screen.queryByRole(
        'status',
        {
          name:
            'Bienvenido a CodeGym',
        },
      ),
    ).not.toBeInTheDocument();
  });

});
