import { expect, test } from './fixtures';

const FIX_CODE_SOLUTION = 'function dobles(numeros) {\n  return numeros.map((n) => n * 2);\n}';
const FIX_CODE_BROKEN = 'function dobles(numeros) {\n  return numeros;\n}';

test.use({ reducedMotion: 'no-preference' });
test.use({ authScenario: 'main-flow' });

test('completa una sesión real desde la navegación hasta el progreso', async ({ page }) => {
  // El recorrido ejercita sesión, editor, resultados, revisión y seis
  // breakpoints. Firefox puede superar el límite general bajo la carga de los
  // tres navegadores, por lo que el presupuesto queda acotado a este flujo.
  test.setTimeout(60_000);

  await page.goto('/');
  await expect(page).toHaveURL('/');
  await page
    .getByRole('complementary', { name: 'Barra lateral' })
    .getByRole('link', { name: 'Entrenar' })
    .click();
  await expect(page).toHaveURL('/tech');

  const javascriptLink = page
    .getByRole('main')
    .getByRole('link', { name: /JavaScript/i });
  // La primera carga incluye los providers y el catálogo lazy. Esperamos el
  // contenido real en vez de asumir que aparece dentro del timeout por defecto.
  await expect(javascriptLink).toBeVisible({ timeout: 15_000 });
  await javascriptLink.click();
  await expect(page).toHaveURL('/tech/javascript');
  await expect(page.getByRole('heading', { name: 'JavaScript', exact: true })).toBeVisible();

  await page.getByRole('link', { name: /^Arrays\b/ }).click();
  await expect(page).toHaveURL('/tech/javascript/js-arrays');
  await expect(page.getByRole('heading', { name: 'Arrays', exact: true })).toBeVisible();

  await expect(page.getByRole('heading', { name: 'Métodos de iteración de arrays' })).toBeVisible();
  await page.locator('article', { has: page.getByRole('heading', { name: 'forEach no devuelve lo que crees' }) }).getByRole('link', { name: 'Empezar práctica' }).click();
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
  const workspace = page.getByRole('region', { name: 'Espacio de código' });
  const problemPanel = page.getByRole('complementary', { name: 'Enunciado y requisitos' });
  const editorPanel = page.getByRole('region', { name: 'Tu solución' });
  const terminalPanel = page.getByRole('region', { name: 'Terminal de ejecución' });

  for (const width of [320, 390, 768, 1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(workspace).toBeVisible();
    const [workspaceBox, problemBox, editorBox, terminalBox] = await Promise.all([
      workspace.boundingBox(),
      problemPanel.boundingBox(),
      editorPanel.boundingBox(),
      terminalPanel.boundingBox(),
    ]);
    expect(workspaceBox).not.toBeNull();
    expect(problemBox).not.toBeNull();
    expect(editorBox).not.toBeNull();
    expect(terminalBox).not.toBeNull();
    if (workspaceBox === null || problemBox === null || editorBox === null || terminalBox === null) continue;

    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
    if (width >= 1024) {
      expect(Math.abs(problemBox.y - editorBox.y)).toBeLessThan(4);
      expect(problemBox.x).toBeLessThan(editorBox.x);
    } else {
      expect(editorBox.y).toBeGreaterThan(problemBox.y);
    }
    expect(terminalBox.y).toBeGreaterThan(Math.max(problemBox.y, editorBox.y));
    expect(Math.abs(terminalBox.x - workspaceBox.x)).toBeLessThan(4);
    expect(Math.abs(terminalBox.width - workspaceBox.width)).toBeLessThan(4);
  }

  await page.getByRole('button', { name: 'Usar editor de texto simple' }).click();
  const editor = page.getByRole('textbox', { name: 'Editor de código' });
  await editor.fill(FIX_CODE_BROKEN);
  await page.getByRole('button', { name: 'Ejecutar tests' }).click();
  await expect(page.getByText('Hay tests que necesitan corrección.')).toBeVisible();
  await page.getByRole('tab', { name: 'Tests' }).click();
  await expect(page.getByText('Expected').first()).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Tests' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('tab', { name: /Problemas/ })).toContainText('2');
  await page.getByRole('tab', { name: /Problemas/ }).click();
  await expect(page.getByText(/\[FAIL\]/).first()).toBeVisible();

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
  await expect(page.getByRole('region', { name: 'Resultado registrado' })).toBeVisible();
  await page.getByRole('button', { name: 'Siguiente' }).click();
  await expect(page.getByText(/Pregunta 2 de/)).toBeVisible();
  await page.getByRole('button', { name: 'Anterior' }).click();
  await expect(page.getByText(/Pregunta 1 de/)).toBeVisible();
  await page.getByRole('link', { name: 'Volver a resultados' }).click();

  await expect(page).toHaveURL('/results/js-arrays-map-vs-foreach-01');
  await page
    .getByRole('complementary', { name: 'Barra lateral' })
    .getByRole('link', { name: 'Progreso' })
    .click();
  await expect(page).toHaveURL('/dashboard');
  await expect(page.getByRole('heading', { name: 'Progreso', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Actividad reciente' })).toBeVisible();
  for (const width of [320, 390, 768, 1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.getByRole('heading', { name: 'Progreso', exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  }
  await page.locator('a[href="/tech/javascript"]', { hasText: 'Ver tecnología' }).click();
  await expect(page).toHaveURL('/tech/javascript');
});
