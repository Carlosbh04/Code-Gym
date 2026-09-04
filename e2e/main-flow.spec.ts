import { expect, test } from '@playwright/test';

const FIX_CODE_SOLUTION = 'function dobles(numeros) {\n  return numeros.map((n) => n * 2);\n}';
const FIX_CODE_BROKEN = 'function dobles(numeros) {\n  return numeros;\n}';

test('completa una sesión real desde la navegación hasta el progreso', async ({ page }) => {
  await page.goto('/');

  const javascriptLink = page
    .getByRole('region', { name: /Tecnologías/i })
    .getByRole('link', { name: /JavaScript/i });
  await expect(javascriptLink).toBeVisible();
  await javascriptLink.click();
  await expect(page).toHaveURL('/tech/javascript');
  await expect(page.getByRole('heading', { name: 'JavaScript' })).toBeVisible();

  await page.getByRole('link', { name: /Arrays.*Ver tema/i }).click();
  await expect(page).toHaveURL('/tech/javascript/js-arrays');
  await expect(page.getByRole('heading', { name: 'Arrays', exact: true })).toBeVisible();

  await expect(page.getByRole('heading', { name: 'Métodos de iteración de arrays' })).toBeVisible();
  await page.getByRole('link', { name: /forEach no devuelve lo que crees.*Empezar práctica/i }).click();
  await expect(page.getByRole('heading', { name: /forEach no devuelve/i })).toBeVisible();

  await page.getByRole('button', { name: /Ver una pista/i }).click();
  await expect(page.getByText(/Pista 1 de/)).toBeVisible();

  await page.getByRole('radio').first().check();
  await expect(page.getByRole('button', { name: 'Comprobar' })).toBeEnabled();
  await page.getByRole('button', { name: 'Comprobar' }).click();
  await expect(page.getByText(/Respuesta (correcta|incorrecta)/)).toBeVisible();
  await page.getByRole('button', { name: 'Siguiente paso' }).click();

  await page.getByRole('radio').first().check();
  await page.getByRole('button', { name: 'Comprobar' }).click();
  await page.getByRole('button', { name: 'Siguiente paso' }).click();

  await page.getByRole('group', { name: 'Línea del error' }).getByRole('radio').first().check();
  await page.getByRole('group', { name: 'Tipo de error' }).getByRole('radio').first().check();
  await page.getByRole('button', { name: 'Comprobar' }).click();
  await page.getByRole('button', { name: 'Siguiente paso' }).click();

  await expect(page.getByText(/Corrige `dobles`/)).toBeVisible();
  await page.getByRole('button', { name: 'Usar editor de texto simple' }).click();
  const editor = page.getByRole('textbox', { name: 'Editor de código' });
  await editor.fill(FIX_CODE_BROKEN);
  await page.getByRole('button', { name: 'Ejecutar tests' }).click();
  await expect(page.getByText('Hay tests que necesitan corrección.')).toBeVisible();
  await expect(page.getByText('Expected').first()).toBeVisible();

  await editor.fill(FIX_CODE_SOLUTION);
  await page.getByRole('button', { name: 'Ejecutar tests' }).click();
  await expect(page.getByText('Todos los tests han pasado.')).toBeVisible();
  await page.getByRole('button', { name: 'Comprobar' }).click();
  await expect(page.getByText('Respuesta correcta')).toBeVisible();
  await page.getByRole('button', { name: 'Terminar sesión' }).click();

  await expect(page).toHaveURL('/results/js-arrays-map-vs-foreach-01');
  await expect(page.getByRole('heading', { name: 'Resultado de la sesión' })).toBeVisible();
  await page.getByRole('link', { name: 'Revisar respuestas' }).click();

  await expect(page).toHaveURL('/review/js-arrays-map-vs-foreach-01');
  await expect(page.getByRole('heading', { name: 'Revisión de la sesión' })).toBeVisible();
  await page.getByRole('link', { name: 'Volver al resultado' }).click();

  await expect(page).toHaveURL('/results/js-arrays-map-vs-foreach-01');
  await page.getByRole('link', { name: 'Ver mi progreso' }).click();
  await expect(page).toHaveURL('/dashboard');
  await expect(page.locator('p').filter({ hasText: /codegym progress.*conceptos practicados/i })).toBeVisible();
});
