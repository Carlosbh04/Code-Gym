import { expect, test } from './fixtures';

test('conserva el salto al contenido y no desborda en los breakpoints soportados', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page).toHaveURL('/');

  const skipLink = page.getByRole('link', { name: 'Saltar al contenido principal' });
  await skipLink.focus();
  await expect(skipLink).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#main-content')).toBeFocused();

  for (const width of [320, 390, 768, 1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.getByRole('heading', { name: 'Todo empieza con la primera práctica.', exact: true })).toBeVisible();
    const topBar = page.getByRole('banner', { name: 'Barra de usuario' });
    const sidebar = page.getByRole('complementary', { name: 'Barra lateral' });
    const mobileNav = page.locator('nav.fixed');
    await expect(topBar).toBeVisible();
    await expect(topBar.getByLabel('Usuario actual: Carlos')).toBeVisible();
    await expect(topBar.getByRole('link')).toHaveCount(0);
    const search = topBar.getByRole('search', { name: 'Búsqueda de contenido' });
    await expect(search).toBeVisible();
    await expect(search.getByRole('combobox')).toBeVisible({ visible: width >= 768 });
    await expect(search.getByRole('button', { name: 'Abrir búsqueda' })).toBeVisible({ visible: width < 768 });
    await expect(sidebar).toBeVisible({ visible: width >= 640 });
    await expect(mobileNav).toBeVisible({ visible: width < 640 });
    await expect
      .poll(() =>
        page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      )
      .toBe(true);
  }
});

test('Sidebar navega en desktop y MobileNav conserva las mismas rutas en móvil', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');
  await expect(page).toHaveURL('/');
  const sidebar = page.getByRole('complementary', { name: 'Barra lateral' });
  await sidebar.getByRole('link', { name: 'Progreso' }).click();
  await expect(page).toHaveURL('/dashboard');
  await sidebar.getByRole('link', { name: 'Entrenar' }).click();
  await expect(page).toHaveURL('/tech');
  await sidebar.getByRole('link', { name: 'Repasar' }).click();
  await expect(page).toHaveURL('/review');
  await sidebar.getByRole('link', { name: 'Inicio' }).click();
  await expect(page).toHaveURL('/');

  await page.setViewportSize({ width: 390, height: 844 });
  const mobileNav = page.locator('nav.fixed');
  await expect(sidebar).toBeHidden();
  await mobileNav.getByRole('link', { name: 'Progreso' }).click();
  await expect(page).toHaveURL('/dashboard');
  await mobileNav.getByRole('link', { name: 'Entrenar' }).click();
  await expect(page).toHaveURL('/tech');
  await mobileNav.getByRole('link', { name: 'Repasar' }).click();
  await expect(page).toHaveURL('/review');
  await mobileNav.getByRole('link', { name: 'Inicio' }).click();
  await expect(page).toHaveURL('/');
});
