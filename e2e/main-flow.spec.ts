import { expect, test } from '@playwright/test';

const FIX_CODE_SOLUTION = 'function dobles(numeros) {\n  return numeros.map((n) => n * 2);\n}';
const FIX_CODE_BROKEN = 'function dobles(numeros) {\n  return numeros;\n}';

test.use({ reducedMotion: 'no-preference' });

test('completa una sesión real desde la navegación hasta el progreso', async ({ page }) => {
  await page.goto('/');

  const javascriptLink = page
    .getByRole('region', { name: /Tecnologías/i })
    .getByRole('link', { name: /JavaScript/i });
  await expect(javascriptLink).toBeVisible();
  await javascriptLink.click();
  await expect(page).toHaveURL('/tech/javascript');
  await expect(page.getByRole('heading', { name: 'JavaScript', exact: true })).toBeVisible();

  await page.getByRole('link', { name: /^Arrays\b/ }).click();
  await expect(page).toHaveURL('/tech/javascript/js-arrays');
  await expect(page.getByRole('heading', { name: 'Arrays', exact: true })).toBeVisible();

  await expect(page.getByRole('heading', { name: 'Métodos de iteración de arrays' })).toBeVisible();
  await page.getByRole('link', { name: /forEach no devuelve lo que crees.*Empezar práctica/i }).click();
  await expect(page.getByRole('heading', { name: /forEach no devuelve/i })).toBeVisible();

  await page.getByRole('button', { name: /Ver una pista/i }).click();
  await expect(page.getByText(/Pista 1 de/)).toBeVisible();

  await page.getByRole('radio', { name: 'undefined' }).check();
  await expect(page.getByRole('button', { name: 'Comprobar' })).toBeEnabled();
  await page.getByRole('button', { name: 'Comprobar' }).click();
  await expect(page.getByText('Respuesta correcta')).toBeVisible();
  await expect(page.locator('[data-confetti-mode="inline"]')).toBeVisible();
  await page.getByRole('button', { name: 'Siguiente paso' }).click();

  await page.getByRole('radio').first().check();
  await page.getByRole('button', { name: 'Comprobar' }).click();
  await expect(page.locator('[data-confetti-mode="inline"]')).toBeVisible();
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
  await expect(page.locator('[data-confetti-mode="code"]')).toBeVisible();
  await page.getByRole('button', { name: 'Terminar sesión' }).click();

  await expect(page.getByRole('heading', { name: '¡Sesión completada!' })).toBeVisible();
  await expect(page.locator('[data-confetti-mode="complete"]')).toBeVisible();
  await page.getByRole('link', { name: 'Ver resultados' }).click();

  await expect(page).toHaveURL('/results/js-arrays-map-vs-foreach-01');
  await expect(page.getByRole('heading', { name: 'Tu resultado' })).toBeVisible();
  await page.getByRole('link', { name: 'Revisar respuestas' }).click();

  await expect(page).toHaveURL('/review/js-arrays-map-vs-foreach-01');
  await expect(page.getByRole('heading', { name: 'Revisión de respuestas' })).toBeVisible();
  await expect(page.getByText(/Pregunta 1 de/)).toBeVisible();
  await expect(page.getByRole('region', { name: 'Tu respuesta' })).toBeVisible();
  await page.getByRole('button', { name: 'Siguiente' }).click();
  await expect(page.getByText(/Pregunta 2 de/)).toBeVisible();
  await page.getByRole('button', { name: 'Anterior' }).click();
  await expect(page.getByText(/Pregunta 1 de/)).toBeVisible();
  await page.getByRole('link', { name: 'Volver a resultados' }).click();

  await expect(page).toHaveURL('/results/js-arrays-map-vs-foreach-01');
  await page.getByRole('link', { name: 'Ver mi progreso' }).click();
  await expect(page).toHaveURL('/dashboard');
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Actividad reciente' })).toBeVisible();
  for (const width of [320, 390, 768, 1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  }
  await page.locator('a[href="/tech/javascript"]', { hasText: 'Ver tecnología' }).click();
  await expect(page).toHaveURL('/tech/javascript');
});
