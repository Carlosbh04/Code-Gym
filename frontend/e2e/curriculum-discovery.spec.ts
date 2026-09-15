import { expect, test } from './fixtures';

const curricula = [
  ['JavaScript', 'Arrays'],
  ['HTML', 'Estructura de documentos'],
  ['CSS', 'Cascade y especificidad'],
  ['React', 'Componentes'],
  ['Node.js', 'Módulos'],
  ['SQL', 'SELECT'],
] as const;

test.describe('descubrimiento del currículo ampliado', () => {
  test.describe.configure({ mode: 'parallel' });

  for (const [technology, topic] of curricula) {
    test(`${technology} descubre teoría estructurada y práctica desde Entrenar`, async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL('/');
    await page
      .getByRole('complementary', { name: 'Barra lateral' })
      .getByRole('link', { name: 'Entrenar' })
      .click();
    await expect(page).toHaveURL('/tech');

    await page
      .getByRole('main')
      .getByRole('link', { name: new RegExp(`^${technology}(?:\\s|$)`, 'i') })
      .click();
    await expect(page.getByRole('heading', { level: 1, name: technology })).toBeVisible();
    const topicLink = page.getByRole('link', { name: new RegExp(`^${topic}(?:\\s|$)`, 'i') });
    await topicLink.focus();
    await page.keyboard.press('Enter');

    await expect(page.getByRole('heading', { level: 2, name: 'Teoría y conceptos' })).toBeVisible();
    await expect(page.getByRole('region', { name: /Teoría de/ }).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('heading', { level: 4, name: 'Introducción' }).first()).toBeVisible();
    await expect(page.getByRole('heading', { level: 4, name: 'Mini comprobación' }).first()).toBeVisible();
    await page.getByRole('link', { name: /Empezar práctica/i }).first().click();
    await expect(page).toHaveURL(/\/practice\/[^/]+$/);
    await expect(page.getByRole('button', { name: 'Comprobar' })).toBeVisible();
    });
  }
});
