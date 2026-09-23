import { expect, test } from './fixtures';

const BREAKPOINTS = [320, 390, 768, 1024, 1280, 1440] as const;

test.use({
  authScenario:
    'arrays-access',
});

test('TechnologyPage reorganiza resumen, tabs y filas sin overflow', async ({ page }) => {
  // Firefox necesita margen al recorrer 18 combinaciones de tab/breakpoint
  // cuando toda la matriz multiengine se ejecuta en paralelo.
  test.setTimeout(60_000);
  await page.goto('/tech/javascript');

  await expect(page.getByRole('heading', { level: 1, name: 'JavaScript' })).toBeVisible();
  const summary = page.getByRole('region', { name: 'Resumen de progreso en JavaScript' });
  const topics = page.getByRole('region', { name: 'Temas de JavaScript' });
  // El resumen depende del catálogo completo; Firefox puede tardar más bajo
  // la carga multiproyecto aunque la navegación ya haya terminado.
  await expect(summary).toBeVisible({ timeout: 15_000 });
  await expect(
    topics.locator(
      'a[href="/tech/javascript/js-arrays"]',
    ),
  ).toBeVisible();

  for (const width of BREAKPOINTS) {
    await page.setViewportSize({ width, height: 900 });

    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
      .toBe(true);

    const panels = summary.locator(':scope > div > div');
    const first = await panels.nth(0).boundingBox();
    const second = await panels.nth(1).boundingBox();
    const third = await panels.nth(2).boundingBox();

    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
    expect(third).not.toBeNull();

    if (first === null || second === null || third === null) continue;

    if (width >= 1280) {
      expect(Math.abs(first.y - second.y)).toBeLessThan(2);
      expect(Math.abs(first.y - third.y)).toBeLessThan(2);
    } else if (width >= 768) {
      expect(Math.abs(first.y - second.y)).toBeLessThan(2);
      expect(third.y).toBeGreaterThan(first.y + first.height - 2);
    } else {
      expect(second.y).toBeGreaterThan(first.y + first.height - 2);
      expect(third.y).toBeGreaterThan(second.y + second.height - 2);
    }

    const tabs = page.getByRole('navigation', { name: 'Secciones de tecnología' });
    await tabs.getByRole('link', { name: 'Ejercicios' }).click();
    await expect(page.getByRole('region', { name: 'Ejercicios de JavaScript' })).toBeVisible({ timeout: 10_000 });
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
      .toBe(true);

    await tabs.getByRole('link', { name: 'Resultados' }).click();
    await expect(page.getByRole('region', { name: 'Resultados de JavaScript' })).toBeVisible({ timeout: 10_000 });
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
      .toBe(true);

    await tabs.getByRole('link', { name: 'Temas' }).click();
    await expect(topics).toBeVisible();
  }
});
