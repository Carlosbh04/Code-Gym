import { expect, test } from '@playwright/test';

test('conserva el salto al contenido y no desborda en los breakpoints soportados', async ({
  page,
}) => {
  await page.goto('/');

  const skipLink = page.getByRole('link', { name: 'Saltar al contenido principal' });
  await skipLink.focus();
  await expect(skipLink).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#main-content')).toBeFocused();

  for (const width of [320, 390, 768, 1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.getByRole('heading', { name: 'Hola, Carlos' })).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      )
      .toBe(true);
  }
});
