import { expect, test } from './fixtures';

const BREAKPOINTS = [320, 390, 768, 1024, 1280, 1440] as const;

test.describe('con progreso persistido por el backend', () => {
  test.use({ authScenario: 'review-progress' });

test('Repasar convierte progreso real en recomendaciones, recovery y actividad responsive', async ({ page }) => {
  test.setTimeout(60_000);
  await page.addInitScript(() => {
    sessionStorage.setItem('codegym:session', JSON.stringify({
      sessionId: 'js-arrays-filter-mutation-01',
      currentStep: 1,
      answers: [{
        stepId: 'js-arrays-filter-mutation-01-step-1',
        stepType: 'code-reading',
        answer: 'c',
        isCorrect: true,
        timeSpentMs: 1_000,
        hintsUsed: 0,
      }],
      elapsedMs: 1_000,
      revealedHints: [],
      startTime: 1,
    }));
  });

  await page.goto('/review');

  const accuracy = page.getByRole('region', { name: 'Precisión general' });
  const weakConcepts = page.getByRole('region', { name: 'Conceptos más débiles' });
  const concepts = page.getByRole('region', { name: 'Conceptos a reforzar' });
  const activity = page.getByRole('region', { name: 'Últimos repasos' });
  await expect(page.getByRole('heading', { level: 1, name: 'Repasar' })).toBeVisible();
  const overallAccuracy = accuracy.getByRole('progressbar', { name: 'Precisión general' });

    await expect(overallAccuracy).toBeVisible({
      timeout: 15_000,
    });

    await expect
      .poll(async () => {
        const value =
          await overallAccuracy.getAttribute(
            'aria-valuenow',
          );

        const parsed =
          Number(value);

        return Number.isFinite(parsed)
          && parsed >= 0
          && parsed <= 100;
      })
      .toBe(true);
  await expect(weakConcepts.getByText('Métodos de iteración de arrays')).toBeVisible();
  const weakConceptAccuracy =
    weakConcepts.getByRole('progressbar');

  await expect(weakConceptAccuracy).toBeVisible();

  await expect
    .poll(async () => {
      const value =
        await weakConceptAccuracy.getAttribute(
          'aria-valuenow',
        );

      const parsed =
        Number(value);

      return Number.isFinite(parsed)
        && parsed >= 0
        && parsed <= 100;
    })
    .toBe(true);
  await expect(concepts).toBeVisible({ timeout: 15_000 });
  await expect(concepts.getByRole('heading', { name: 'Métodos de iteración de arrays' }).first()).toBeVisible();
  await expect.poll(() => concepts.getByRole('heading', { name: 'Métodos de iteración de arrays' }).count()).toBeGreaterThanOrEqual(2);
  await expect(concepts.getByText(/En progreso/)).toBeVisible();
  await expect(concepts.getByRole('link', { name: /Continuar/ })).toHaveAttribute('href', '/practice/js-arrays-filter-mutation-01');
  await expect(concepts.getByText('Completada')).toBeVisible();
  await expect(activity.getByRole('link', { name: 'Abrir repaso' }).first()).toHaveAttribute('href', '/review/js-arrays-map-vs-foreach-01');
  await expect(activity.getByRole('link', { name: 'Ver resultado' }).first()).toHaveAttribute('href', '/results/js-arrays-map-vs-foreach-01');
  await expect(activity.getByText('50%').first()).toBeVisible();

  for (const width of BREAKPOINTS) {
    await page.setViewportSize({ width, height: 1000 });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

    // REVIEW_LAYOUT_SETTLED:
    // Wait for the viewport resize to complete its browser layout cycle before
    // measuring geometry. This avoids reading bounding boxes mid-reflow without
    // weakening the actual alignment contract below.
    await page.evaluate(
      () =>
        new Promise<void>((resolve) => {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              resolve();
            });
          });
        }),
    );

    const [accuracyBox, weakBox, conceptBox, activityBox] = await Promise.all([
      accuracy.boundingBox(),
      weakConcepts.boundingBox(),
      concepts.boundingBox(),
      activity.boundingBox(),
    ]);
    expect(accuracyBox).not.toBeNull();
    expect(weakBox).not.toBeNull();
    expect(conceptBox).not.toBeNull();
    expect(activityBox).not.toBeNull();
    if (accuracyBox === null || weakBox === null || conceptBox === null || activityBox === null) continue;
    if (width >= 1024) {
      expect(Math.abs(accuracyBox.y - weakBox.y)).toBeLessThan(3);
      expect(accuracyBox.x).toBeLessThan(weakBox.x);
    } else {
      expect(weakBox.y).toBeGreaterThanOrEqual(accuracyBox.y + accuracyBox.height - 3);
    }
    expect(conceptBox.y).toBeGreaterThanOrEqual(Math.max(accuracyBox.y + accuracyBox.height, weakBox.y + weakBox.height) - 3);
    expect(activityBox.y).toBeGreaterThanOrEqual(conceptBox.y + conceptBox.height - 3);
  }

  await concepts.getByRole('link', { name: /Continuar/ }).click();
  await expect(page).toHaveURL('/practice/js-arrays-filter-mutation-01');
  await page.goto('/review');
  await activity.getByRole('link', { name: 'Ver resultado' }).first().click();
  await expect(page).toHaveURL('/results/js-arrays-map-vs-foreach-01');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});
});

test.describe('sin progreso previo', () => {
  test.use({ authScenario: 'review-empty' });

test('Repasar ofrece un estado vacío útil sin inventar métricas', async ({ page }) => {

  await page.goto('/review');

  await expect(page.getByRole('heading', { level: 1, name: 'Repasar' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Precisión general' })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole('img', { name: 'Precisión general todavía no disponible' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Conceptos más débiles' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Todavía no hay suficiente actividad para generar un repaso personalizado.' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Ir a entrenar/ })).toHaveAttribute('href', '/tech');
  await expect(page.getByRole('main').getByText(/\b(?:XP|racha|nivel|ranking)\b/i)).toHaveCount(0);
});
});
