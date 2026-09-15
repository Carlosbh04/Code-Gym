import { expect, test } from './fixtures';

const SESSION_ID = 'js-arrays-map-vs-foreach-01';

test('navega, filtra y abre una sesión desde Ejercicios conservando back/forward', async ({ page }) => {
  await page.goto('/tech/javascript');

  const tabs = page.getByRole('navigation', { name: 'Secciones de tecnología' });
  await tabs.getByRole('link', { name: 'Ejercicios' }).click();
  await expect(page).toHaveURL('/tech/javascript?tab=exercises');
  const exercises = page.getByRole('region', { name: 'Ejercicios de JavaScript' });
  await expect(exercises).toBeVisible({
    timeout: 15_000,
  });
  await exercises.getByRole('button', { name: 'Pendientes' }).click();
  await expect(exercises.getByRole('button', { name: 'Pendientes' })).toHaveAttribute('aria-pressed', 'true');

  const firstAvailable = exercises.getByRole('link', { name: /^Empezar práctica$/ }).first();
  await expect(firstAvailable).toBeVisible();
  await firstAvailable.click();
  await expect(page).toHaveURL(/\/practice\//);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

  await page.goBack();
  await expect(page).toHaveURL('/tech/javascript?tab=exercises');
  await expect(exercises).toBeVisible();
  await tabs.getByRole('link', { name: 'Resultados' }).click();
  await expect(page).toHaveURL('/tech/javascript?tab=results');
  await expect(page.getByRole('region', { name: 'Resultados de JavaScript' })).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL('/tech/javascript?tab=exercises');
  await page.goForward();
  await expect(page).toHaveURL('/tech/javascript?tab=results');
});

test.describe('con un resultado persistido por el backend', () => {
  test.use({ authScenario: 'technology-results' });

test('abre un resultado persistido y su revisión desde Resultados', async ({ page }) => {
  await page.goto('/tech/javascript?tab=results');

  const results = page.getByRole('region', { name: 'Resultados de JavaScript' });
  const row = results.locator('article', {
    has: page.getByRole('heading', { name: 'forEach no devuelve lo que crees' }),
  });
  await expect(row).toContainText(
    '4/4',
    { timeout: 15_000 },
  );
  await expect(row).toContainText('100%');
  await row.getByRole('link', { name: 'Ver resultado' }).click();

  await expect(page).toHaveURL(`/results/${SESSION_ID}`);
  await expect(page.getByRole('heading', { name: 'Tu resultado' })).toBeVisible();
  await page.getByRole('link', { name: 'Revisar respuestas' }).click();
  await expect(page).toHaveURL(`/review/${SESSION_ID}`);
  await expect(page.getByRole('heading', { name: 'Revisión de respuestas' })).toBeVisible();
});
});

test('pagina Ejercicios de ocho en ocho y conserva la página en la URL', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/tech/javascript?tab=exercises');

  const exercises = page.getByRole('region', { name: 'Ejercicios de JavaScript' });
  const pagination = exercises.getByRole('navigation', { name: 'Paginación de ejercicios' });
  await expect(exercises.locator('article')).toHaveCount(
    8,
    { timeout: 15_000 },
  );
  await expect(pagination).toContainText('Mostrando 1–8 de 28 ejercicios');
  await expect(pagination.getByRole('button', { name: 'Página anterior' })).toBeDisabled();

  await pagination.getByRole('button', { name: 'Ir a la página 2' }).click();
  await expect(page).toHaveURL('/tech/javascript?tab=exercises&page=2');
  await expect(exercises.locator('article')).toHaveCount(
    8,
    { timeout: 15_000 },
  );
  await expect(pagination).toContainText('Mostrando 9–16 de 28 ejercicios');

  await pagination.getByRole('button', { name: 'Ir a la página 4' }).click();
  await expect(page).toHaveURL('/tech/javascript?tab=exercises&page=4');
  await expect(exercises.locator('article')).toHaveCount(
    4,
    { timeout: 15_000 },
  );
  await expect(pagination).toContainText('Mostrando 25–28 de 28 ejercicios');
  await expect(pagination.getByRole('button', { name: 'Página siguiente' })).toBeDisabled();

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(pagination.getByText('4 / 4')).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  await page.goBack();
  await expect(page).toHaveURL('/tech/javascript?tab=exercises&page=2');
  await expect(exercises.locator('article')).toHaveCount(
    8,
    { timeout: 15_000 },
  );

  const tabs = page.getByRole('navigation', { name: 'Secciones de tecnología' });
  await tabs.getByRole('link', { name: 'Temas' }).click();
  await expect(page).toHaveURL('/tech/javascript?tab=topics');
  await expect(page.getByRole('region', { name: 'Temas de JavaScript' })).toBeVisible();
});
