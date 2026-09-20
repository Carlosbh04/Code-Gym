import { expect, test } from './fixtures';

const BREAKPOINTS = [320, 390, 768, 1024, 1280, 1440] as const;

test('la raíz autenticada renderiza la Home canónica para un usuario nuevo', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveURL('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Todo empieza con la primera práctica.' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Elige tu tecnología' })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole('link', { name: 'Empezar' })).toHaveAttribute('href', '/tech');
  const technologyLinks = [
    ['JavaScript', '/tech/javascript'],
    ['HTML', '/tech/html'],
    ['CSS', '/tech/css'],
    ['React', '/tech/react'],
    ['Node.js', '/tech/nodejs'],
    ['SQL', '/tech/sql'],
  ] as const;

  await expect(
    page.getByRole(
      'link',
      {
        name:
          /^Comenzar /,
      },
    ),
  ).toHaveCount(
    technologyLinks.length,
    {
      timeout:
        15_000,
    },
  );

  for (const [name, href] of technologyLinks) {
    await expect(page.getByRole('link', { name: `Comenzar ${name}` }))
      .toHaveAttribute('href', href);
  }

  await expect(page.getByRole('link', { name: /^Comenzar / })).toHaveCount(6);
  await expect(page.getByText('Continúa tu práctica')).toHaveCount(0);
  await expect(page.getByText('Actividad reciente')).toHaveCount(0);
  await expect(page.getByText('Tu progreso')).toHaveCount(0);
  await expect(page.getByText('0%', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('heading', { level: 1, name: 'Progreso' })).toHaveCount(0);
});

test.describe('con progreso persistido por el backend', () => {
  test.use({ authScenario: 'dashboard' });

  test('la raíz autenticada muestra la Home avanzada con progreso real', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveURL('/');
    await expect(page.getByRole('heading', { name: '¿Qué quieres entrenar hoy?' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Tu progreso' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Actividad reciente' })
      .locator('a[href^="/results/"]').first()).toBeVisible({ timeout: 15_000 });
  });
});

test('la Home conserva el shell y evita overflow en todos los breakpoints', async ({ page }) => {
  await page.goto('/');

  for (const width of BREAKPOINTS) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('main')).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

    if (width >= 768) {
      await expect(page.getByRole('navigation', { name: 'Navegación principal' })).toBeVisible();
    } else {
      await expect(page.getByRole('navigation', { name: 'Navegación principal' })).toBeVisible();
    }
  }
});

test('Inicio vuelve a Home y conserva el AppLayout desde Entrenar', async ({ page }) => {
  await page.goto('/tech');
  await expect(page.getByRole('heading', { level: 1, name: 'Entrenar' })).toBeVisible();

  await page.getByRole('navigation', { name: 'Navegación principal' })
    .getByRole('link', { name: 'Inicio' }).click();

  await expect(page).toHaveURL('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Todo empieza con la primera práctica.' })).toBeVisible();
  await expect(page.getByRole('banner')).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Navegación principal' })).toBeVisible();
});

test('dashboard queda reservado para la página de Progreso', async ({ page }) => {
  await page.goto('/dashboard');

  await expect(page).toHaveURL('/dashboard');
  await expect(page.getByRole('heading', { level: 1, name: 'Progreso' })).toBeVisible();
});
