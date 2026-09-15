import { expect, test } from './fixtures';

test('sigue el tema del sistema en vivo cuando no hay preferencia manual', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/');

  const root = page.locator('html');
  await expect(root).toHaveAttribute('data-theme', 'system');
  await expect(root).toHaveAttribute('data-resolved-theme', 'light');
  await expect(root).toHaveClass(/\blight\b/);
  await expect(page.getByRole('button', { name: /Tema: Sistema\. Apariencia clara/ })).toBeVisible();

  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(root).toHaveAttribute('data-resolved-theme', 'dark');
  await expect(root).toHaveClass(/\bdark\b/);
  await expect(page.getByRole('button', { name: /Tema: Sistema\. Apariencia oscura/ })).toBeVisible();
});

test('persiste una preferencia manual y permite volver al sistema', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/');

  const root = page.locator('html');
  const trigger = page.getByRole('button', { name: /Tema:/ });
  await trigger.click();
  await page.getByRole('menuitemradio', { name: /Claro/ }).click();

  await expect(root).toHaveAttribute('data-theme', 'light');
  await expect(root).toHaveAttribute('data-resolved-theme', 'light');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('codegym:theme'))).toBe('light');

  await page.reload();
  await expect(root).toHaveClass(/\blight\b/);
  await expect(root).toHaveAttribute('data-theme', 'light');

  await page.emulateMedia({ colorScheme: 'light' });
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(root).toHaveAttribute('data-resolved-theme', 'light');

  await page.getByRole('button', { name: /Tema:/ }).click();
  await page.getByRole('menuitemradio', { name: /Sistema/ }).click();
  await expect(root).toHaveAttribute('data-theme', 'system');
  await expect(root).toHaveAttribute('data-resolved-theme', 'dark');

  await page.emulateMedia({ colorScheme: 'light' });
  await expect(root).toHaveAttribute('data-resolved-theme', 'light');
});

test('aplica el tema claro globalmente sin overflow en las rutas y breakpoints principales', async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.setItem('codegym:theme', 'light'));

  for (const path of ['/', '/tech', '/dashboard', '/review']) {
    await page.goto(path);
    await expect(page.locator('html')).toHaveClass(/\blight\b/);
    await expect(page.locator('body')).toHaveCSS('color-scheme', 'light');
  }

  await page.goto('/');
  for (const width of [320, 390, 768, 1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.getByRole('banner', { name: 'Barra de usuario' })).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
      .toBe(true);
  }
});

test('sincroniza colores en una transición corta sin animar sombras ni CodeMirror', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('codegym:theme', 'dark'));
  await page.goto('/');
  await expect(page).toHaveURL('/');
  await page.getByRole('heading', { name: 'Todo empieza con la primera práctica.', exact: true }).waitFor();

  const root = page.locator('html');
  await root.evaluate((element) => element.classList.add('theme-transition'));

  const transition = await page.locator('[class*="bg-card"]').first().evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      property: style.transitionProperty,
      duration: style.transitionDuration,
      delay: style.transitionDelay,
    };
  });
  expect(transition).toEqual({
    property: 'background-color, border-color, color',
    duration: '0.14s',
    delay: '0s',
  });
  expect(await page.evaluate(() => [...document.querySelectorAll('*')].filter((element) => {
    const property = getComputedStyle(element).transitionProperty;
    return property.includes('box-shadow') && property.includes('fill') && property.includes('stroke');
  }).length)).toBeLessThanOrEqual(1);

  expect(await page.evaluate(() => {
    const host = document.createElement('div');
    host.className = 'codegym-editor';
    const editor = document.createElement('div');
    editor.className = 'cm-editor';
    host.append(editor);
    document.body.append(host);
    const duration = getComputedStyle(editor).transitionDuration;
    host.remove();
    return duration;
  })).toBe('0s');

  await root.evaluate((element) => element.classList.remove('theme-transition'));
  await page.getByRole('button', { name: /Tema:/ }).click();
  await page.getByRole('menuitemradio', { name: /Claro/ }).click();
  await expect(root).toHaveAttribute('data-resolved-theme', 'light');
  await expect(root).not.toHaveClass(/theme-transition/);
});
