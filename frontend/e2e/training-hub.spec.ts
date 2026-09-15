import { expect, test } from './fixtures';

const BREAKPOINTS = [320, 390, 768, 1024, 1280, 1440] as const;

test.use({ authScenario: 'dashboard' });

test('Entrenar abre el catálogo, agrupa tecnologías y conserva navegación responsive', async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto('/');
  await expect(page).toHaveURL('/');
  await page.getByRole('link', { name: 'Entrenar', exact: true }).first().click();
  await expect(page).toHaveURL('/tech');
  await expect(page.getByRole('heading', { level: 1, name: 'Entrenar' })).toBeVisible();
  await expect(page.getByText('Catálogo de práctica')).toHaveCount(0);

  const web = page.getByRole('region', { name: 'Tecnologías de desarrollo web' });
  const advanced = page.getByRole('region', { name: 'Tecnologías avanzadas' });
  await expect(web.locator('li')).toHaveCount(
    3,
    { timeout: 15_000 },
  );
  await expect(advanced.locator('li')).toHaveCount(3);
  await expect(page.getByRole('link', { name: /^JavaScript\s/ })).toContainText('Continuar');
  await expect(page.getByRole('link', { name: /^HTML\s/ })).toContainText('Entrenar');
  await expect(page.getByRole('link', { name: 'Ver mi progreso' })).toHaveAttribute('href', '/dashboard');

  for (const width of BREAKPOINTS) {
    await page.setViewportSize({ width, height: 900 });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const firstSectionCards = await web.locator('li').evaluateAll((cards) =>
      cards.map((card) => ({ x: Math.round(card.getBoundingClientRect().x), y: Math.round(card.getBoundingClientRect().y) })),
    );
    const columns = new Set(firstSectionCards.map(({ x }) => x)).size;
    expect(columns).toBe(width >= 1280 ? 3 : width >= 768 ? 2 : 1);
    for (const link of await page.getByRole('link', { name: 'Entrenar', exact: true }).all()) {
      if (await link.isVisible()) await expect(link).toHaveAttribute('aria-current', 'page');
    }
  }

  for (const technology of ['JavaScript', 'HTML', 'React', 'SQL']) {
    await page.getByRole('link', { name: new RegExp(`^${technology}\\s`) }).click();
    await expect(page).toHaveURL(new RegExp(`/tech/${technology === 'JavaScript' ? 'javascript' : technology.toLowerCase()}$`));
    await expect(page.getByRole('heading', { level: 1, name: technology })).toBeVisible();
    await page.goBack();
    await expect(page).toHaveURL('/tech');
    await expect(page.getByRole('heading', { level: 1, name: 'Entrenar' })).toBeVisible();
    for (const link of await page.getByRole('link', { name: 'Entrenar', exact: true }).all()) {
      if (await link.isVisible()) await expect(link).toHaveAttribute('aria-current', 'page');
    }
  }
});
