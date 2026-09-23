import { expect, test, type Page } from './fixtures';

const AUTH_USER = {
  id: 'user-e2e-menu',
  email: 'carlos@codegym.dev',
  displayName: 'Carlos Benítez',
  role: 'USER',
  createdAt: '2026-09-13T08:00:00.000Z',
  updatedAt: '2026-09-13T08:00:00.000Z',
};

async function authenticate(page: Page) {
  let currentUser = {
    ...AUTH_USER,
  };
  const profileUpdates: unknown[] = [];

  await page.route('**/auth/me', async (route) => {
    if (route.request().method() === 'PATCH') {
      const input = route.request().postDataJSON() as {
        displayName: string;
      };
      profileUpdates.push(input);
      currentUser = {
        ...currentUser,
        displayName: input.displayName,
        updatedAt: '2026-09-13T10:00:00.000Z',
      };
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ user: currentUser }),
    });
  });

  return {
    profileUpdates,
  };
}

test('muestra el perfil real y mantiene el popover alineado en desktop y móvil', async ({ page }) => {
  await authenticate(page);

  for (const [width, expectedMenuWidth] of [[1440, 352], [320, 288]] as const) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/dashboard');

    const trigger = page.getByRole('button', { name: 'Usuario actual: Carlos Benítez' });
    await trigger.click();

    const popover = page.getByLabel('Perfil de usuario');
    await expect(popover).toBeVisible();
    await expect(popover.getByText('carlos@codegym.dev')).toBeVisible();
    await expect.poll(async () => Math.round((await popover.boundingBox())?.width ?? 0)).toBe(expectedMenuWidth);
    await expect.poll(async () => {
      const box = await popover.boundingBox();
      return box !== null && box.x >= 0 && box.x + box.width <= width;
    }).toBe(true);

    await page.keyboard.press('Escape');
    await expect(popover).toBeHidden();
    await expect(trigger).toBeFocused();
  }
});

test('cierra al hacer clic fuera y completa el logout real una sola vez', async ({ page }) => {
  await authenticate(page);
  let logoutRequests = 0;
  await page.route('**/auth/logout', async (route) => {
    logoutRequests += 1;
    await route.fulfill({ status: 204 });
  });
  await page.goto('/dashboard');

  const trigger = page.getByRole('button', { name: 'Usuario actual: Carlos Benítez' });
  await trigger.click();
  await page.locator('main').click({ position: { x: 8, y: 8 } });
  await expect(page.getByLabel('Perfil de usuario')).toBeHidden();

  await trigger.click();
  await page.getByRole('menuitem', { name: 'Cerrar sesión' }).click();

  await expect(page).toHaveURL('/login');
  expect(logoutRequests).toBe(1);
});

test('abre Mi perfil desde el menú y muestra los datos autenticados', async ({ page }) => {
  await authenticate(page);
  await page.goto('/dashboard');

  await page.getByRole('button', { name: 'Usuario actual: Carlos Benítez' }).click();
  await page.getByRole('menuitem', { name: 'Mi perfil' }).click();

  await expect(page).toHaveURL('/profile');
  await expect(page.getByRole('heading', { level: 1, name: 'Mi perfil' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Carlos Benítez' })).toBeVisible();
  await expect(page.getByText('carlos@codegym.dev').first()).toBeVisible();
  await expect(page.getByText('USER').first()).toBeVisible();
  await expect(page.getByText('13 de septiembre de 2026')).toBeVisible();
  await expect(page.getByRole('menu')).toBeHidden();

  for (const width of [320, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect.poll(() => page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    )).toBe(true);
  }
});

test('edita displayName y sincroniza ProfilePage con UserMenu', async ({ page }) => {
  const {
    profileUpdates,
  } = await authenticate(page);
  await page.goto('/profile');

  await page.getByRole('button', { name: 'Editar perfil' }).click();
  const input = page.getByLabel('Nombre visible');
  await expect(input).toBeFocused();
  await input.fill('Carlos Hernández');
  await page.getByRole('button', { name: 'Guardar cambios' }).click();

  await expect(
    page.getByRole('heading', {
      level: 2,
      name: 'Carlos Hernández',
    }),
  ).toBeVisible();
  expect(profileUpdates).toEqual([
    {
      displayName: 'Carlos Hernández',
    },
  ]);

  await page.getByRole('button', {
    name: 'Usuario actual: Carlos Hernández',
  }).click();
  await expect(
    page.getByLabel('Perfil de usuario').getByText('Carlos Hernández'),
  ).toBeVisible();
});
