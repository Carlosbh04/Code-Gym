import { expect, test } from './fixtures';

test('usa los seis PNG reales en Entrenar, TechnologyPage y búsqueda', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL('/');

  for (const path of ['/tech', '/tech/javascript']) {
    await page.goto(path);
    const javascriptIcon = page.locator('[data-technology-icon="javascript"][data-technology-icon-source="asset"] img').first();
    await expect(javascriptIcon).toBeVisible({
      timeout: 15_000,
    });
    await expect.poll(
      () => javascriptIcon.evaluate((image) => (image as HTMLImageElement).naturalWidth),
      { timeout: 15_000 },
    ).toBe(96);
  }

  await page.goto('/tech');
  await expect(
    page.getByRole('region', {
      name: 'Tecnologías de desarrollo web',
    }),
  ).toBeVisible({ timeout: 15_000 });

  for (const technologyId of ['javascript', 'html', 'css', 'react', 'nodejs', 'sql']) {
    const image = page.locator(`[data-technology-icon="${technologyId}"][data-technology-icon-source="asset"] img`).first();
    await expect(image).toBeVisible({
      timeout: 15_000,
    });
    await expect.poll(
      () => image.evaluate((element) => (element as HTMLImageElement).naturalHeight),
      { timeout: 15_000 },
    ).toBe(96);
  }

  const search = page.getByRole('search', { name: 'Búsqueda de contenido' });
  await search.getByRole('combobox').fill('javascript');
  const result = page.getByRole('option').filter({ hasText: 'Tecnología · JavaScript' }).first();
  await expect(result.locator('[data-technology-icon="javascript"] img')).toBeVisible({
    timeout: 15_000,
  });
});
