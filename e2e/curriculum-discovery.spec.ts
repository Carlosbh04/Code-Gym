import { expect, test } from '@playwright/test';

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
    test(`${technology} descubre teoría estructurada y práctica desde inicio`, async ({ page }) => {
    await page.goto('/');

    await page
      .getByRole('region', { name: /Tecnologías/i })
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
