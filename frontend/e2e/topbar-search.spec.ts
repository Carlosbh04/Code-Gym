import { expect, test } from './fixtures';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() =>
    localStorage.removeItem('codegym:search-history'),
  );
  await page.reload();
  await expect(page).toHaveURL('/');
});

test('busca arrays, navega al tema y conserva la búsqueda reciente', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  const search = page.getByRole('search', { name: 'Búsqueda de contenido' });
  const input = search.getByRole('combobox');

  await expect(input).toBeVisible();
  const shortcut = await page.evaluate(() => /Mac|iPhone|iPad|iPod/.test(navigator.platform) ? 'Meta+K' : 'Control+K');
  await page.keyboard.press(shortcut);
  await expect(input).toBeFocused();
  await expect(input).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('heading', { name: 'Sugeridos para ti' })).toBeVisible();
  await input.fill('arrays');
  await page.getByRole('option').filter({ hasText: 'Tema · JavaScript' }).first().click();
  await expect(page).toHaveURL('/tech/javascript/js-arrays');

  await expect
    .poll(() =>
      page.evaluate(() =>
        localStorage.getItem('codegym:search-history'),
      ),
    )
    .toContain('arrays');

  await input.click();
  await expect(input).toHaveAttribute('aria-expanded', 'true');
  await input.fill('');

  await expect(
    page.getByRole('button', {
      name: 'arrays',
      exact: true,
    }),
  ).toBeVisible();
});

test('abre resultados de React y SQL con teclado y click', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const input = page.getByRole('search', { name: 'Búsqueda de contenido' }).getByRole('combobox');

  await input.fill('react');
  await expect(page.getByRole('option').first()).toBeVisible({ timeout: 20_000 });
  await input.press('ArrowDown');
  await expect(page.getByRole('option').first()).toHaveAttribute('aria-selected', 'true');
  await input.press('Enter');
  await expect(page).toHaveURL('/tech/react');

  await input.click();
  await expect(input).toHaveAttribute('aria-expanded', 'true');
  await input.fill('sql');

  const sqlResult = page
    .getByRole('option')
    .filter({ hasText: 'Tecnología · SQL' })
    .first();
  await expect(sqlResult).toBeVisible({ timeout: 20_000 });
  await sqlResult.click();
  await expect(page).toHaveURL('/tech/sql');
});

test.describe(
  'con acceso canónico a Practice',
  () => {
    // SEARCH_CANONICAL_SESSION_SCENARIO
    test.use({
      authScenario:
        'main-flow',
    });

    test('encuentra una sesión real y abre su workspace', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 900 });
  const input = page.getByRole('search', { name: 'Búsqueda de contenido' }).getByRole('combobox');

  await input.fill('Taller: seleccionar con filter');
  await page.getByRole('option').filter({ hasText: 'Sesión · JavaScript' }).first().click();
      await expect(
        page,
      ).toHaveURL(
        '/practice/js-arrays-filter-mutation-01',
      );
    });
  },
);

test('mantiene proporciones y alineación premium en tablet y desktop', async ({ page }) => {
  for (const [width, expectedSearchWidth] of [
    [768, 320],
    [1024, 448],
    [1280, 480],
    [1440, 480],
  ] as const) {
    await page.setViewportSize({ width, height: 900 });
    const search = page.getByRole('search', { name: 'Búsqueda de contenido' });
    const input = search.getByRole('combobox');
    const user = page.getByLabel('Usuario actual: Carlos');
    const avatar = user.locator('span').first();

    await expect(input).toBeVisible();
    await expect.poll(async () => Math.round((await search.boundingBox())?.width ?? 0)).toBe(expectedSearchWidth);
    await expect.poll(async () => Math.round((await input.boundingBox())?.height ?? 0)).toBe(48);
    await expect.poll(async () => Math.round((await avatar.boundingBox())?.width ?? 0)).toBe(40);
    await expect(user.getByText('Carlos')).toBeVisible();

    await input.click();
    const panel = page.getByLabel('Panel de búsqueda');
    await expect(panel).toBeVisible();
    await expect.poll(async () => {
      const searchBox = await search.boundingBox();
      const panelBox = await panel.boundingBox();
      return Math.round(Math.abs((searchBox?.x ?? 0) - (panelBox?.x ?? 0)));
    }).toBe(0);
    await input.press('Escape');
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
});

test('se adapta a móvil, cierra con Escape y no desborda', async ({ page }) => {
  for (const width of [320, 390, 768, 1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const search = page.getByRole('search', { name: 'Búsqueda de contenido' });

    if (width < 768) {
      await search.getByRole('button', { name: 'Abrir búsqueda' }).click();
    } else {
      await search.getByRole('combobox').click();
    }

    const panel = page.getByLabel('Panel de búsqueda');
    await expect(panel).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
      .toBe(true);
    await page.getByRole('combobox').press('Escape');
    await expect(panel).toBeHidden();
  }
});
