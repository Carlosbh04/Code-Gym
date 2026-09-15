import {
  expect,
  test,
  type Page,
} from '@playwright/test';

async function authenticate(page: Page) {
  await page.route('**/auth/refresh', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ accessToken: 'access-token-security-e2e' }),
  }));
  await page.route('**/auth/me', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      user: {
        id: 'user-security-e2e',
        email: 'carlos@codegym.dev',
        displayName: 'Carlos Benítez',
        role: 'USER',
        createdAt: '2026-09-13T08:00:00.000Z',
        updatedAt: '2026-09-13T08:00:00.000Z',
      },
    }),
  }));
}

test('usuario autenticado abre Seguridad y valida su nueva contraseña', async ({ page }) => {
  await authenticate(page);
  await page.route('**/auth/change-password', async (route) => {
    expect(route.request().headers().authorization).toBe('Bearer access-token-security-e2e');
    expect(await route.request().postDataJSON()).toEqual({
      currentPassword: 'CurrentPassword1!',
      newPassword: 'NewSecurePassword1!',
    });
    await route.fulfill({ status: 204 });
  });
  await page.goto('/dashboard');

  await page.getByRole('button', { name: 'Usuario actual: Carlos Benítez' }).click();
  await page.getByRole('menuitem', { name: 'Configuración' }).click();

  await expect(page).toHaveURL(/\/settings\/security$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Seguridad' })).toBeVisible();

  const currentPassword = page.getByLabel('Contraseña actual', { exact: true });
  const newPassword = page.getByLabel('Nueva contraseña', { exact: true });
  const confirmation = page.getByLabel('Confirmar nueva contraseña', { exact: true });
  const submit = page.getByRole('button', { name: 'Cambiar contraseña' });

  await expect(currentPassword).toHaveAttribute('type', 'password');
  await expect(newPassword).toHaveAttribute('type', 'password');
  await expect(confirmation).toHaveAttribute('type', 'password');
  await expect(submit).toBeDisabled();

  await currentPassword.fill('CurrentPassword1!');
  await newPassword.fill('NewSecurePassword1!');
  await confirmation.fill('NewSecurePassword1!');

  await expect(page.getByText('Las contraseñas coinciden').locator('..')).toHaveAttribute('data-state', 'satisfied');
  await expect(submit).toBeEnabled();

  await page.getByRole('button', { name: 'Mostrar nueva contraseña' }).click();
  await expect(newPassword).toHaveAttribute('type', 'text');
  await expect(currentPassword).toHaveAttribute('type', 'password');

  await submit.click();
  await expect(page).toHaveURL(/\/settings\/security$/);
  await expect(page.getByRole('status')).toContainText('Contraseña actualizada');
  await expect(page.getByRole('status')).toContainText('Tu contraseña se ha cambiado correctamente.');
  await expect(currentPassword).toHaveCount(0);
  await expect(newPassword).toHaveCount(0);
  await expect(confirmation).toHaveCount(0);
});

test('Seguridad muestra errores reales y no éxito ficticio', async ({ page }) => {
  await authenticate(page);
  let attempts = 0;
  await page.route('**/auth/change-password', async (route) => {
    attempts += 1;
    const error = attempts === 1
      ? { code: 'INVALID_CURRENT_PASSWORD', message: 'Current password is incorrect' }
      : { code: 'NEW_PASSWORD_SAME_AS_CURRENT', message: 'New password must differ' };
    await route.fulfill({
      status: 400,
      contentType: 'application/json',
      body: JSON.stringify({ error }),
    });
  });
  await page.goto('/settings/security');

  const currentPassword = page.getByLabel('Contraseña actual', { exact: true });
  const newPassword = page.getByLabel('Nueva contraseña', { exact: true });
  const confirmation = page.getByLabel('Confirmar nueva contraseña', { exact: true });
  await currentPassword.fill('IncorrectPassword1!');
  await newPassword.fill('NewSecurePassword1!');
  await confirmation.fill('NewSecurePassword1!');
  await page.getByRole('button', { name: 'Cambiar contraseña' }).click();
  await expect(page.getByRole('alert')).toHaveText('La contraseña actual no es correcta.');
  await expect(page.getByText('Contraseña actualizada')).toHaveCount(0);

  await currentPassword.fill('NewSecurePassword1!');
  await expect(page.getByRole('alert')).toHaveCount(0);
  await page.getByRole('button', { name: 'Cambiar contraseña' }).click();
  await expect(page.getByRole('alert')).toHaveText(
    'La nueva contraseña debe ser diferente de la actual.',
  );
  await expect(page.getByText('Contraseña actualizada')).toHaveCount(0);
});

test('Seguridad mantiene su composición responsive', async ({ page }) => {
  await authenticate(page);
  await page.goto('/settings/security');

  for (const width of [320, 375, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });

    await expect.poll(
      () => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await expect(page.getByRole('heading', { level: 1, name: 'Seguridad' })).toBeVisible();
    await expect(page.getByLabel('Contraseña actual', { exact: true })).toBeVisible();
  }
});
