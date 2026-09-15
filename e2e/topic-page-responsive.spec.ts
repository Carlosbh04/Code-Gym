import { expect, test, type Page } from './fixtures';

const BREAKPOINTS = [320, 390, 768, 1024, 1280, 1440] as const;

async function expectNoHorizontalOverflow(page: Page) {
  await expect.poll(() => page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth,
  )).toBe(true);
}

test('TopicPage conserva la composición de referencia en seis breakpoints', async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto('/tech/javascript/js-arrays');

  await expect(page.getByRole('heading', { level: 1, name: 'Arrays' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Teoría y conceptos' })).toBeVisible();
  // Topic content is loaded asynchronously; WebKit can exceed the default
  // expect timeout while all three browser projects share the same workers.
  await expect(page.getByRole('region', { name: 'Sesiones disponibles' })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByRole('heading', { level: 3, name: 'Principiante · 2 sesiones' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 3, name: 'Intermedio · 1 sesión' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 3, name: 'Avanzado · 1 sesión' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Taller: transformar precios' })).toBeVisible();
  await expect(page.getByText('1 ejercicio', { exact: true })).toBeVisible();

  for (const width of BREAKPOINTS) {
    await page.setViewportSize({ width, height: 1000 });
    await expectNoHorizontalOverflow(page);

    const theoryBox = await page.getByRole('region', { name: 'Teoría y conceptos' }).boundingBox();
    const practiceBox = await page.getByRole('region', { name: 'Sesiones disponibles' }).boundingBox();
    expect(theoryBox).not.toBeNull();
    expect(practiceBox).not.toBeNull();

    if (theoryBox === null || practiceBox === null) continue;
    if (width >= 1280) {
      expect(Math.abs(theoryBox.y - practiceBox.y)).toBeLessThan(3);
      expect(theoryBox.x).toBeLessThan(practiceBox.x);
    } else {
      expect(practiceBox.y).toBeGreaterThanOrEqual(theoryBox.y + theoryBox.height - 3);
    }
  }
});

test('Entrenar lleva al topic y una práctica iniciada vuelve como En progreso', async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto('/tech');

  await page.getByRole('link', { name: /^JavaScript —/ }).click();
  await expect(page).toHaveURL('/tech/javascript');
  await page.getByRole('link', { name: /^Arrays\b/ }).click();
  await expect(page).toHaveURL('/tech/javascript/js-arrays');

  const sessionCard = page.locator('article', {
    has: page.getByRole('heading', { name: 'Filter no debería mutar' }),
  });
  await sessionCard.getByRole('link', { name: 'Empezar práctica' }).click();
  await expect(page).toHaveURL('/practice/js-arrays-filter-mutation-01');
  await expect(page.getByRole('button', { name: 'Comprobar' })).toBeVisible();
  await expect.poll(() => page.evaluate(() => sessionStorage.getItem('codegym:session') !== null)).toBe(true);

  await page.goBack();
  await expect(page).toHaveURL('/tech/javascript/js-arrays');
  const resumedCard = page.locator('article', {
    has: page.getByRole('heading', { name: 'Filter no debería mutar' }),
  });
  await expect(resumedCard.getByText('En progreso')).toBeVisible();
  await expect(resumedCard.getByRole('link', { name: 'Continuar práctica' })).toHaveAttribute(
    'href',
    '/practice/js-arrays-filter-mutation-01',
  );
});
