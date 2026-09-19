import { expect, test, type Page } from '@playwright/test';

const email = 'recovery@example.test';
const securityCode = '004821';
const initialPassword = 'Initial password 123!';
const replacementPassword = 'Replacement password 456!';

async function installPasswordResetHarness(page: Page) {
  let acceptedPassword = initialPassword;

  await page.route('**/auth/refresh', (route) => route.fulfill({
    status: 401,
    contentType: 'application/json',
    body: JSON.stringify({ error: { code: 'INVALID_REFRESH_SESSION', message: 'invalid' } }),
  }));
  await page.route('**/auth/password-reset/request', async (route) => {
    expect(await route.request().postDataJSON()).toEqual({ email });
    await route.fulfill({
      status: 202,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'If an account exists, a security code will be sent.' }),
    });
  });
  await page.route('**/auth/password-reset/verify', async (route) => {
    const body = await route.request().postDataJSON() as { email: string; code: string };
    expect(body).toEqual({ email, code: securityCode });
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ resetToken: 'A'.repeat(43) }),
    });
  });
  await page.route('**/auth/password-reset/confirm', async (route) => {
    const body = await route.request().postDataJSON() as Record<string, unknown>;
    expect(body).toEqual({ resetToken: 'A'.repeat(43), newPassword: replacementPassword });
    expect(body).not.toHaveProperty('confirmPassword');
    acceptedPassword = replacementPassword;
    await route.fulfill({ status: 204 });
  });
  await page.route('**/auth/login', async (route) => {
    const body = await route.request().postDataJSON() as { email: string; password: string };
    if (body.email !== email || body.password !== acceptedPassword) {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: { code: 'INVALID_CREDENTIALS', message: 'invalid' } }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        accessToken: 'header.payload.signature',
        user: {
          id: 'user-recovery', email, displayName: 'Recovery User', role: 'USER',
          createdAt: '2026-09-13T00:00:00.000Z', updatedAt: '2026-09-13T00:00:00.000Z',
        },
      }),
    });
  });
}

test('completes the public password reset and accepts only the new password', async ({ page }) => {
  await installPasswordResetHarness(page);
  await page.goto('/login');
  await page.getByRole('button', { name: '¿Olvidaste tu contraseña?' }).click();
  await expect(page).toHaveURL(/\/forgot-password$/);

  await page.getByRole('textbox', { name: 'Correo electrónico' }).fill(email);
  await page.getByRole('button', { name: 'Enviar código' }).click();
  await expect(page.getByRole('heading', { name: 'Comprueba tu correo' })).toBeVisible();
  await expect(page.getByText(/r•••••••@example\.test/)).toBeVisible();

  const codeInputs = page.getByRole('group', { name: 'Código de seguridad de 6 dígitos' }).getByRole('textbox');
  for (let index = 0; index < securityCode.length; index += 1) {
    await codeInputs.nth(index).fill(securityCode[index] ?? '');
  }
  await page.getByRole('button', { name: 'Verificar código' }).click();
  await expect(page.getByRole('heading', { name: 'Crea una nueva contraseña' })).toBeVisible();

  await page.getByRole('textbox', { name: 'Nueva contraseña', exact: true }).fill(replacementPassword);
  await page.getByRole('textbox', { name: 'Confirmar nueva contraseña', exact: true }).fill(replacementPassword);
  await page.getByRole('button', { name: 'Restablecer contraseña' }).click();
  await expect(page.getByRole('heading', { name: 'Contraseña actualizada' })).toBeVisible();
  await expect(page.getByText(/sesiones anteriores.*se han cerrado/i)).toBeVisible();

  await page.getByRole('link', { name: 'Iniciar sesión' }).click();
  await page.getByLabel('Email').fill(email);
  await page.getByRole('textbox', { name: 'Contraseña', exact: true }).fill(initialPassword);
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
  await expect(page.getByText('Email o contraseña incorrectos.')).toBeVisible();

  await page.getByRole('textbox', { name: 'Contraseña', exact: true }).fill(replacementPassword);
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
  await expect(page).toHaveURL('/');
});

test('distinguishes incorrect, expired, and exhausted verification codes', async ({ page }) => {
  await page.route('**/auth/refresh', (route) => route.fulfill({
    status: 401,
    contentType: 'application/json',
    body: JSON.stringify({ error: { code: 'INVALID_REFRESH_SESSION', message: 'invalid' } }),
  }));
  await page.route('**/auth/password-reset/request', (route) => route.fulfill({
    status: 202,
    contentType: 'application/json',
    body: JSON.stringify({ message: 'If an account exists, a security code will be sent.' }),
  }));
  await page.route('**/auth/password-reset/verify', async (route) => {
    const { code } = await route.request().postDataJSON() as { code: string };
    const error = code === '111111'
      ? { status: 400, code: 'INVALID_RESET_CODE', message: 'Invalid security code' }
      : code === '222222'
        ? { status: 410, code: 'RESET_CODE_EXPIRED', message: 'Security code expired' }
        : { status: 410, code: 'RESET_CODE_ATTEMPTS_EXCEEDED', message: 'Maximum attempts exceeded' };
    await route.fulfill({
      status: error.status,
      contentType: 'application/json',
      body: JSON.stringify({ error: { code: error.code, message: error.message } }),
    });
  });

  await page.goto('/forgot-password');
  await page.getByRole('textbox', { name: 'Correo electrónico' }).fill(email);
  await page.getByRole('button', { name: 'Enviar código' }).click();
  const codeInputs = page.getByRole('group', { name: 'Código de seguridad de 6 dígitos' }).getByRole('textbox');
  async function fillCode(code: string) {
    for (let index = 0; index < code.length; index += 1) {
      await codeInputs.nth(index).fill(code[index] ?? '');
    }
  }

  await fillCode('111111');
  await page.getByRole('button', { name: 'Verificar código' }).click();
  await expect(page.getByRole('alert')).toHaveText('El código introducido no es correcto.');
  await codeInputs.first().fill('2');
  await expect(page.getByRole('alert')).toHaveCount(0);

  await fillCode('222222');
  await page.getByRole('button', { name: 'Verificar código' }).click();
  await expect(page.getByRole('alert')).toHaveText('Este código ha caducado. Solicita uno nuevo.');
  await expect(page.getByRole('button', { name: 'Enviar un nuevo código' })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Verificar código' })).toBeDisabled();

  await page.getByRole('button', { name: 'Enviar un nuevo código' }).click();
  await expect(page.getByRole('alert')).toHaveCount(0);

  await fillCode('333333');
  await page.getByRole('button', { name: 'Verificar código' }).click();
  await expect(page.getByRole('alert')).toHaveText(
    'Has alcanzado el máximo de intentos. Solicita un nuevo código.',
  );
  await expect(page.getByRole('heading', { name: 'Crea una nueva contraseña' })).toHaveCount(0);
});

test('recovery remains overflow-free at required breakpoints', async ({ page }) => {
  await installPasswordResetHarness(page);
  await page.goto('/forgot-password');

  for (const width of [320, 375, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await expect(page.getByRole('heading', { name: 'Restablecer contraseña' })).toBeVisible();
  }

  await page.getByRole('textbox', { name: 'Correo electrónico' }).fill(email);
  await page.getByRole('button', { name: 'Enviar código' }).click();
  for (const width of [320, 375, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await expect(page.getByRole('group', { name: 'Código de seguridad de 6 dígitos' })).toBeVisible();
  }

  const codeInputs = page.getByRole('group', { name: 'Código de seguridad de 6 dígitos' }).getByRole('textbox');
  for (let index = 0; index < securityCode.length; index += 1) {
    await codeInputs.nth(index).fill(securityCode[index] ?? '');
  }
  await page.getByRole('button', { name: 'Verificar código' }).click();
  for (const width of [320, 375, 768, 1440]) {
    await page.setViewportSize({ width, height: 1_100 });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await expect(page.getByRole('heading', { name: 'Crea una nueva contraseña' })).toBeVisible();
  }
});

test('shows the server Retry-After countdown and unlocks the email form', async ({ page }) => {
  await page.route('**/auth/password-reset/request', (route) => route.fulfill({
    status: 429,
    contentType: 'application/json',
    headers: {
      'Retry-After': '4',
      'Access-Control-Expose-Headers': 'Retry-After',
      'Access-Control-Allow-Origin': 'http://127.0.0.1:4173',
      'Access-Control-Allow-Credentials': 'true',
    },
    body: JSON.stringify({ error: { code: 'RATE_LIMITED', message: 'Too many requests' } }),
  }));
  await page.goto('/forgot-password');
  await page.getByRole('textbox', { name: 'Correo electrónico' }).fill(email);
  await page.getByRole('button', { name: 'Enviar código' }).click();

  await expect(page.getByRole('heading', { name: 'Recupera tu acceso' })).toBeVisible();
  await expect(page.getByRole('alert')).toContainText('Has alcanzado el límite de solicitudes');
  await expect(page.getByText(/Reintentar en 00:0[1-4]/)).toBeVisible();
  await expect(page.getByRole('button', { name: /temporalmente bloqueada/i })).toBeDisabled();
  await expect(page.getByRole('textbox', { name: 'Correo electrónico' })).toHaveCount(0);

  for (const width of [320, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await expect(page.getByRole('alert')).toBeVisible();
  }

  await expect(page.getByRole('heading', { name: 'Restablecer contraseña' })).toBeVisible({ timeout: 5_500 });
  await expect(page.getByRole('textbox', { name: 'Correo electrónico' })).toHaveValue(email);
});
