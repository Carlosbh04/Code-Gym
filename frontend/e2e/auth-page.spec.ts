import { expect, test } from '@playwright/test';

const BREAKPOINTS = [320, 390, 768, 1024, 1280, 1440] as const;

test('auth combina login y registro sin salir de la página ni mostrar el shell privado', async ({ page }) => {
  await page.goto('/login');

  await expect(page.getByRole('heading', { level: 1, name: 'Los desarrolladores también entrenan.' })).toBeVisible();
  await expect(page.getByText('// Practica. Aprende. Mejora.')).toBeVisible();
  await expect(page.getByLabel('Código de práctica')).toBeVisible();
  await expect(page.getByText('Código hoy. Oportunidades mañana.')).toBeVisible();
  const firstHeroLine = page.locator('.auth-hero-title-line--one');
  const secondHeroLine = page.locator('.auth-hero-title-line--two');
  const reflectionStyles = await Promise.all([
    firstHeroLine.evaluate((line) => {
      const base = getComputedStyle(line);
      const reflection = getComputedStyle(line, '::after');
      return {
        baseBackground: base.backgroundImage,
        baseColor: base.color,
        animationName: reflection.animationName,
        animationDelay: reflection.animationDelay,
        animationDuration: reflection.animationDuration,
        animationTimingFunction: reflection.animationTimingFunction,
        overlayBackground: reflection.backgroundImage,
        overlayZIndex: reflection.zIndex,
      };
    }),
    secondHeroLine.evaluate((line) => {
      const base = getComputedStyle(line);
      const reflection = getComputedStyle(line, '::after');
      return {
        baseBackground: base.backgroundImage,
        baseColor: base.color,
        animationName: reflection.animationName,
        animationDelay: reflection.animationDelay,
        animationDuration: reflection.animationDuration,
        animationTimingFunction: reflection.animationTimingFunction,
        overlayBackground: reflection.backgroundImage,
        overlayZIndex: reflection.zIndex,
      };
    }),
  ]);
  expect(reflectionStyles[0].baseBackground).toBe('none');
  expect(reflectionStyles[1].baseBackground).toBe('none');
  expect(reflectionStyles[0].baseColor).not.toBe('rgba(0, 0, 0, 0)');
  expect(reflectionStyles[1].baseColor).toBe(reflectionStyles[0].baseColor);
  expect(reflectionStyles[0].animationName).toBe('auth-title-line-reflection');
  expect(reflectionStyles[1].animationName).toBe('auth-title-line-reflection');
  expect(reflectionStyles[0].animationDelay).toBe('0.7s');
  expect(reflectionStyles[1].animationDelay).toBe('4.4s');
  expect(reflectionStyles[0].animationDuration).toBe('3.5s');
  expect(reflectionStyles[1].animationDuration).toBe('3.5s');
  expect(reflectionStyles[0].animationTimingFunction).toBe('linear');
  expect(reflectionStyles[1].animationTimingFunction).toBe('linear');
  expect(reflectionStyles[0].overlayBackground).toContain('196, 181, 253');
  expect(reflectionStyles[0].overlayBackground).not.toMatch(/96, 165, 250|216, 180, 254|192, 132, 252/);
  expect(reflectionStyles[0].overlayBackground).not.toBe('none');
  expect(reflectionStyles[0].overlayZIndex).toBe('1');
  await page.waitForTimeout(8_200);
  const finalReflectionOpacities = await Promise.all([
    firstHeroLine.evaluate((line) => getComputedStyle(line, '::after').opacity),
    secondHeroLine.evaluate((line) => getComputedStyle(line, '::after').opacity),
  ]);
  expect(finalReflectionOpacities).toEqual(['0', '0']);
  const heroLineTops = await page.locator('.auth-hero-title-line').evaluateAll((lines) =>
    lines.map((line) => Math.round(line.getBoundingClientRect().top)),
  );
  expect(heroLineTops).toHaveLength(2);
  expect(heroLineTops[1]).toBeGreaterThan(heroLineTops[0]);
  await expect(page.getByLabel('CodeGym', { exact: true })).toHaveCount(1);
  await expect(page.locator('.auth-panel-brand')).toHaveCount(0);
  await expect(page.getByRole('heading', { level: 1, name: 'Bienvenido' })).toBeVisible();
  await expect(page.getByText('Tu espacio para practicar,')).toBeVisible();
  await expect(page.getByText('aprender y mejorar.')).toBeVisible();
  await expect(page.getByLabel('Barra lateral')).toHaveCount(0);
  await expect(page.getByRole('banner')).toHaveCount(0);

  const loginTab = page.getByRole('tab', { name: 'Iniciar sesión' });
  await loginTab.focus();
  await loginTab.press('ArrowRight');
  const registerTab = page.getByRole('tab', { name: 'Crear cuenta' });
  await expect(registerTab).toHaveAttribute('aria-selected', 'true');
  await expect(registerTab).toBeFocused();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Crea tu cuenta' })).toBeVisible();
  await expect(page.getByText('Paso 1 de 3')).toBeAttached();
  await expect(page.getByLabel('Nombre', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Contraseña', { exact: true })).toHaveCount(0);

  await page.getByLabel('Nombre', { exact: true }).fill('Carlos');
  await page.getByLabel('Apellido').fill('Benítez');
  await page.getByLabel('¿Cómo te gustaría que te llamemos?').fill('Charlie');
  await page.getByRole('button', { name: 'Siguiente' }).click();

  await page.getByLabel('Contraseña', { exact: true }).fill('Una contraseña Segura 123!');
  await expect(page.getByRole('progressbar', { name: 'Fortaleza de la contraseña' })).toHaveAttribute('aria-valuenow', '4');

  await page.getByLabel('Email').fill('carlos@example.com');
  await page.getByLabel('Confirmar contraseña', { exact: true }).fill('Una contraseña Segura 123!');
  await page.getByRole('button', { name: 'Siguiente' }).click();
  await expect(page.getByRole('definition').filter({ hasText: 'Charlie' })).toBeVisible();
  await expect(page.getByText('Una contraseña Segura 123!')).toHaveCount(0);
  await expect(page.getByRole('checkbox', { name: /Acepto los términos/ })).toBeVisible();
});

test('auth no desborda en los breakpoints soportados', async ({ page }) => {
  await page.goto('/register');

  for (const width of BREAKPOINTS) {
    await page.setViewportSize({ width, height: 900 });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await expect(page.getByRole('heading', { level: 1, name: 'Los desarrolladores también entrenan.' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 1, name: 'Crea tu cuenta' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Siguiente' })).toBeVisible();
  }
});

test('el reflejo recorre cada línea por separado y desaparece al terminar', async ({ page }) => {
  await page.goto('/login');

  const reflectionOpacity = (selector: string) =>
    page.locator(selector).evaluate((line) => getComputedStyle(line, '::after').opacity);

  await page.waitForTimeout(1_600);
  expect(await reflectionOpacity('.auth-hero-title-line--one')).toBe('1');
  expect(await reflectionOpacity('.auth-hero-title-line--two')).toBe('0');

  await page.waitForTimeout(3_100);
  expect(await reflectionOpacity('.auth-hero-title-line--one')).toBe('0');
  expect(Number(await reflectionOpacity('.auth-hero-title-line--two'))).toBeGreaterThan(0.7);

  await page.waitForTimeout(3_500);
  expect(await reflectionOpacity('.auth-hero-title-line--one')).toBe('0');
  expect(await reflectionOpacity('.auth-hero-title-line--two')).toBe('0');
});

test('auth elimina movimiento decorativo cuando el usuario reduce movimiento', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/auth');

  await expect(page.locator('.auth-panel-entry')).toHaveCSS('animation-name', 'none');
  await expect(page.locator('.auth-brand-entry')).toHaveCSS('animation-name', 'none');
  const reducedReflectionStyles = await page.locator('.auth-hero-title-line').evaluateAll((lines) =>
    lines.map((line) => ({
      baseColor: getComputedStyle(line).color,
      overlayDisplay: getComputedStyle(line, '::after').display,
      overlayAnimation: getComputedStyle(line, '::after').animationName,
    })),
  );
  expect(reducedReflectionStyles).toEqual([
    expect.objectContaining({ overlayDisplay: 'none', overlayAnimation: 'none' }),
    expect.objectContaining({ overlayDisplay: 'none', overlayAnimation: 'none' }),
  ]);
  expect(reducedReflectionStyles[0].baseColor).toBe(reducedReflectionStyles[1].baseColor);
  await expect(page.getByLabel('Código de práctica').locator('pre')).toContainText('// Mejora tus habilidades');
});
