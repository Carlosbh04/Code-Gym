import { expect, test, type Page } from './fixtures';

test.use({
  authScenario:
    'topic-recovery',
});

async function reachCodeEditor(page: Page) {
  await page.goto('/practice/js-arrays-map-vs-foreach-01');
  await expect(page.getByRole('heading', { name: /forEach no devuelve/i })).toBeVisible();

  await page.getByRole('radio', { name: 'undefined' }).check();
  await page.getByRole('button', { name: 'Comprobar' }).click();
  await expect(page.getByText('Respuesta correcta')).toBeVisible();
  await page.getByRole('button', { name: 'Siguiente paso' }).click();

  await page.getByRole('radio').first().check();
  await page.getByRole('button', { name: 'Comprobar' }).click();
  const secondNext = page.getByRole('button', { name: 'Siguiente paso' });
  await expect(secondNext).toBeEnabled();
  await secondNext.click();

  await page.getByRole('group', { name: 'Línea del error' }).getByRole('radio').first().check();
  await page.getByRole('group', { name: 'Tipo de error' }).getByRole('radio').first().check();
  await page.getByRole('button', { name: 'Comprobar' }).click();
  const thirdNext = page.getByRole('button', { name: 'Siguiente paso' });
  await expect(thirdNext).toBeEnabled();
  await thirdNext.click();

  const editor = page.getByRole('textbox', { name: 'Editor de código' });
  await expect(page.locator('.cm-editor')).toBeVisible();
  await expect(editor).toBeVisible();
  await expect(editor).toHaveAttribute('contenteditable', 'true');
  return editor;
}

test('CodeMirror sugiere y acepta JavaScript real con teclado', async ({ page }) => {
  test.setTimeout(45_000);
  const editor = await reachCodeEditor(page);

  await editor.click();
  await editor.press('Control+A');
  await editor.pressSequentially('fun');
  const functionOption = page.getByRole('option', { name: /function/i });
  await expect(functionOption).toBeVisible();
  await editor.press('Enter');
  await expect(editor).toContainText('function');

  await editor.fill('const precios = [10, 20];');
  await expect(editor).toContainText('const precios = [10, 20];');
  await editor.press('End');
  await editor.press('Enter');
  await editor.pressSequentially('pre');
  await expect(page.getByRole('option', { name: /precios/i })).toBeVisible();

  await editor.press('Escape');
  await editor.fill('const arr = [1, 2];');
  await expect(editor).toContainText('const arr = [1, 2];');
  await editor.press('End');
  await editor.press('Enter');
  await editor.pressSequentially('arr.');
  await editor.press('Control+Space');
  await expect(page.getByRole('option', { name: /^map/i })).toBeVisible();
  await expect(page.getByRole('option', { name: /^filter/i })).toBeVisible();
  await editor.press('Escape');

  await page.setViewportSize({ width: 390, height: 844 });
  await editor.pressSequentially('(');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
});
