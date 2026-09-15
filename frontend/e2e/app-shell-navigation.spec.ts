import { expect, test } from './fixtures';

const desktopRoutes = [
  { linkPath: '/dashboard', expectedPath: '/dashboard', heading: 'Progreso' },
  { linkPath: '/tech', expectedPath: '/tech', heading: 'Entrenar' },
  { linkPath: '/review', expectedPath: '/review', heading: 'Repasar' },
  { linkPath: '/', expectedPath: '/', heading: 'Todo empieza con la primera práctica.' },
];

test.describe('shell persistente entre rutas', () => {
  test('mantiene Sidebar y TopBar visibles y reutiliza el mismo AppLayout en desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 800 });
    await page.goto('/tech');
    await page.getByRole('heading', { name: 'Entrenar', exact: true }).waitFor();

    const sidebar = page.getByRole('complementary', { name: 'Barra lateral' });
    const topbar = page.getByRole('banner', { name: 'Barra de usuario' });

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const visibleLogo = sidebar.locator('[aria-label="CodeGym"]:visible');
    await expect(visibleLogo).toBeInViewport();
    await expect(topbar).toBeInViewport();

    for (const route of desktopRoutes) {
      await sidebar.locator(`a[href="${route.linkPath}"]`).click();
      await page.waitForURL((url) => url.pathname === route.expectedPath);
      await page.getByRole('heading', { name: route.heading, exact: true }).waitFor();

      await expect(sidebar).toBeVisible();
      await expect(topbar).toBeVisible();
      await expect(visibleLogo).toBeInViewport();
      await expect(topbar).toBeInViewport();
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
      await expect.poll(() => page.evaluate(() => ({
        sidebars: document.querySelectorAll('aside[aria-label="Barra lateral"]').length,
        topbars: document.querySelectorAll('header[aria-label="Barra de usuario"]').length,
        mains: document.querySelectorAll('#main-content').length,
      }))).toEqual({ sidebars: 1, topbars: 1, mains: 1 });
    }
  });

  test('mantiene TopBar y MobileNav visibles al navegar en móvil', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await expect(page).toHaveURL('/');
    await page.getByRole('heading', { name: 'Todo empieza con la primera práctica.', exact: true }).waitFor();

    const topbar = page.getByRole('banner', { name: 'Barra de usuario' });
    const mobileNav = page.getByRole('navigation', { name: 'Navegación principal' });

    for (const route of desktopRoutes.slice(0, 3)) {
      await mobileNav.getByRole('link', { name: route.heading }).click();
      await page.waitForURL((url) => url.pathname === route.expectedPath);
      await page.getByRole('heading', { name: route.heading, exact: true }).waitFor();

      await expect(topbar).toBeVisible();
      await expect(mobileNav).toBeVisible();
      await expect(topbar).toBeInViewport();
      await expect(mobileNav).toBeInViewport();
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
    }
  });
});
