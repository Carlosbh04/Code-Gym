import { expect, test } from './fixtures';

test('Sidebar mantiene densidad compacta hasta 1024 y se expande desde 1280', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL('/');
  const sidebar = page.getByRole('complementary', { name: 'Barra lateral' });
  const home = sidebar.getByRole('link', { name: 'Inicio' });
  const progress = sidebar.getByRole('link', { name: 'Progreso' });
  const compactLogo = sidebar.locator('div').first().locator('> span.xl\\:hidden');
  const fullLogo = sidebar.locator('div').first().locator('> span.hidden.xl\\:inline');

  for (const [width, expectedSidebarWidth, expanded] of [
    [768, 80, false],
    [1024, 80, false],
    [1280, 240, true],
    [1440, 240, true],
  ] as const) {
    await page.setViewportSize({ width, height: 900 });
    await expect(sidebar).toBeVisible();
    await expect.poll(async () => Math.round((await sidebar.boundingBox())?.width ?? 0)).toBe(expectedSidebarWidth);
    await expect(compactLogo).toBeVisible({ visible: !expanded });
    await expect(fullLogo).toBeVisible({ visible: expanded });
    await expect(home.locator('span.relative.z-10.hidden.xl\\:inline')).toBeVisible({ visible: expanded });
    await expect(home).toHaveAttribute('aria-current', 'page');
    await expect(progress).not.toHaveAttribute('aria-current', 'page');
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(sidebar).toBeHidden();
  await expect(page.locator('nav.fixed')).toBeVisible();
});
