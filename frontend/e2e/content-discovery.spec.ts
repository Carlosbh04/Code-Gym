import { expect, test } from './fixtures';

const topics = [
  ['js-arrays', 'Arrays'],
  ['js-functions', 'Functions'],
  ['js-closures', 'Closures'],
  ['js-promises', 'Promises'],
  ['js-objects', 'Objects'],
  ['js-es6-plus', 'ES6+'],
  ['js-errors', 'Errors'],
] as const;

for (const [topicId, topicName] of topics) {
  test(`${topicName} expone teoría y una sesión de práctica`, async ({ page }) => {
    // La carga dinámica del contenido puede compartir CPU con el resto de la
    // matriz multiengine; el contrato se valida igual sin depender de 5 s.
    test.setTimeout(45_000);
    await page.goto(`/tech/javascript/${topicId}`);

    await expect(page.getByRole('heading', { level: 1, name: topicName })).toBeVisible();
    await expect(page.getByRole('region', { name: /Teoría de/ }).first()).toContainText(/\S+/, { timeout: 15_000 });
    await expect(page.getByRole('heading', { name: 'Sesiones disponibles' }).first()).toBeVisible();
    await page.getByRole('link', { name: /Empezar práctica/i }).first().click();
    await expect(page).toHaveURL(/\/practice\/[^/]+$/);
    await expect(page.getByRole('button', { name: 'Comprobar' })).toBeVisible();
  });
}
