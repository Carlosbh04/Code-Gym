import { expect, test } from '@playwright/test';

test('recorre la navegación de práctica e inicia una sesión real', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'CodeGym' })).toBeVisible();
  await page.getByRole('link', { name: /JavaScript.*Practicar/i }).click();
  await expect(page).toHaveURL('/tech/javascript');
  await expect(page.getByRole('heading', { name: 'JavaScript' })).toBeVisible();

  await page.getByRole('link', { name: /Arrays.*Ver tema/i }).click();
  await expect(page).toHaveURL('/tech/javascript/js-arrays');
  await expect(page.getByRole('heading', { name: 'Arrays' })).toBeVisible();

  // La ruta de sesión es canónica y carga los datos reales de contenido.
  await page.goto('/practice/js-arrays-map-vs-foreach-01');
  await expect(page.getByRole('heading', { name: /forEach no devuelve/i })).toBeVisible();

  await page.getByRole('radio').first().check();
  await expect(page.getByRole('button', { name: 'Comprobar' })).toBeEnabled();
  await page.getByRole('button', { name: 'Comprobar' }).click();
  await expect(page.getByText(/Respuesta (correcta|incorrecta)/)).toBeVisible();
});
