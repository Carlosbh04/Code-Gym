import { expect, test } from './fixtures';

const BREAKPOINTS = [320, 390, 768, 1024, 1280, 1440] as const;

test.use({ authScenario: 'dashboard' });

test('Progreso conserva composición, orden y densidad sin overflow', async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto('/dashboard');

  const general = page.getByRole('region', { name: 'Progreso general' });
  const next = page.getByRole('region', { name: 'Siguiente paso' });
  const metrics = page.getByRole('region', { name: 'Métricas de progreso' });
  const technologies = page.getByRole('region', { name: 'Progreso por tecnología' });
  const activity = page.getByRole('region', { name: 'Actividad reciente' });

  await expect(page.getByRole('heading', { level: 1, name: 'Progreso' })).toBeVisible();
  await expect(page.getByText('Tu camino de aprendizaje')).toHaveCount(0);
  await expect(page.getByText('Tu progreso de aprendizaje, basado en la práctica que has guardado.')).toHaveCount(0);
  await expect(general).toBeVisible();
  await expect(next).toBeVisible();
  await expect(metrics.locator('article')).toHaveCount(5);
  await expect(technologies.getByRole('link', { name: 'Ver tecnología' }).first()).toBeVisible({ timeout: 15_000 });
  await expect(activity.getByRole('link', { name: /Ver resultado de/ }).first()).toBeVisible();

  for (const width of BREAKPOINTS) {
    await page.setViewportSize({ width, height: 900 });
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
      .toBe(true);

    const generalBox = await general.boundingBox();
    const nextBox = await next.boundingBox();
    const technologyBox = await technologies.boundingBox();
    const activityBox = await activity.boundingBox();
    expect(generalBox).not.toBeNull();
    expect(nextBox).not.toBeNull();
    expect(technologyBox).not.toBeNull();
    expect(activityBox).not.toBeNull();
    if (generalBox === null || nextBox === null || technologyBox === null || activityBox === null) continue;

    if (width >= 1280) {
      expect(Math.abs(generalBox.y - nextBox.y)).toBeLessThan(2);
      const technologyActivityVerticalOverlap =
        Math.min(
          technologyBox.y + technologyBox.height,
          activityBox.y + activityBox.height,
        )
        - Math.max(
          technologyBox.y,
          activityBox.y,
        );

      expect(
        technologyActivityVerticalOverlap,
      ).toBeGreaterThan(0);
    } else {
      expect(nextBox.y).toBeGreaterThan(generalBox.y + generalBox.height - 2);
      expect(activityBox.y).toBeGreaterThan(technologyBox.y + technologyBox.height - 2);
    }

    const metricBoxes = await metrics.locator('article').evaluateAll((cards) =>
      cards.map((card) => {
        const rect = card.getBoundingClientRect();

        return {
          width: rect.width,
          height: rect.height,
        };
      }),
    );

    expect(metricBoxes).toHaveLength(5);

    for (const box of metricBoxes) {
      expect(box.width).toBeGreaterThan(0);
      expect(box.height).toBeGreaterThan(0);
    }

  }

});
