import { expect, test } from './fixtures';

const FIX_CODE_SOLUTION = 'function dobles(numeros) {\n  return numeros.map((n) => n * 2);\n}';

test.use({ reducedMotion: 'no-preference' });
test.use({ authScenario: 'main-flow' });

test('completa una sesión real desde la navegación hasta el progreso', async ({ page }) => {
  // El recorrido ejercita sesión, editor, resultados, revisión y seis
  // breakpoints. Firefox puede superar el límite general bajo la carga de los
  // tres navegadores, por lo que el presupuesto queda acotado a este flujo.
  test.setTimeout(60_000);

  await page.goto('/');
  await expect(page).toHaveURL('/');
  await page
    .getByRole('complementary', { name: 'Barra lateral' })
    .getByRole('link', { name: 'Entrenar' })
    .click();
  await expect(page).toHaveURL('/tech');

  const javascriptLink = page
    .getByRole('main')
    .getByRole('link', { name: /JavaScript/i });
  // La primera carga incluye los providers y el catálogo lazy. Esperamos el
  // contenido real en vez de asumir que aparece dentro del timeout por defecto.
  await expect(javascriptLink).toBeVisible({ timeout: 15_000 });
  await javascriptLink.click();
  await expect(page).toHaveURL('/tech/javascript');
  await expect(page.getByRole('heading', { name: 'JavaScript', exact: true })).toBeVisible();

  await page.getByRole('link', { name: /^Arrays\b/ }).click();
  await expect(page).toHaveURL('/tech/javascript/js-arrays');
  await expect(
    page.getByRole('heading', {
      name: 'Arrays',
      exact: true,
      level: 1,
    }),
  ).toBeVisible();

  await expect(
    page.getByRole('heading', {
      name: 'Métodos de iteración de arrays',
      exact: true,
      level: 2,
    }),
  ).toBeVisible();
  await page.locator('article', { has: page.getByRole('heading', { name: 'forEach no devuelve lo que crees' }) }).getByRole('link', { name: 'Empezar práctica' }).click();
  await expect(page.getByRole('heading', { name: /forEach no devuelve/i })).toBeVisible();

  await page.getByRole('button', { name: /Ver una pista/i }).click();
  await expect(page.getByText(/Pista 1 de/)).toBeVisible();

  await page.getByRole('radio', { name: 'undefined' }).check();
  await expect(page.getByRole('button', { name: 'Comprobar' })).toBeEnabled();
  await page.getByRole('button', { name: 'Comprobar' }).click();
  await expect(page.getByText('Respuesta correcta')).toBeVisible();
  await expect(page.locator('[data-confetti-mode="inline"]')).toBeVisible();
  await page.getByRole('button', { name: 'Siguiente paso' }).click();

  await page.getByRole('radio').first().check();
  await page.getByRole('button', { name: 'Comprobar' }).click();
  await expect(page.locator('[data-confetti-mode="inline"]')).toBeVisible();
  await page.getByRole('button', { name: 'Siguiente paso' }).click();

  await page.getByRole('group', { name: 'Línea del error' }).getByRole('radio').first().check();
  await page.getByRole('group', { name: 'Tipo de error' }).getByRole('radio').first().check();
  await page.getByRole('button', { name: 'Comprobar' }).click();
  await page.getByRole('button', { name: 'Siguiente paso' }).click();

  await expect(page.getByText(/Corrige `dobles`/)).toBeVisible();
  const workspace = page.getByRole('region', {
    name: 'Espacio de código',
  });

  const problemPanel = page.getByRole('complementary', {
    name: 'Enunciado y requisitos',
  });

  const editorPanel = page.getByRole('region', {
    name: 'Tu solución',
  });

  for (const width of [
    320,
    390,
    768,
    1024,
    1280,
    1440,
  ]) {
    await page.setViewportSize({
      width,
      height: 900,
    });

    await expect(
      workspace,
    ).toBeVisible();

    await expect(
      problemPanel,
    ).toBeVisible();

    await expect(
      editorPanel,
    ).toBeVisible();

    const [
      workspaceBox,
      problemBox,
      editorBox,
    ] = await Promise.all([
      workspace.boundingBox(),
      problemPanel.boundingBox(),
      editorPanel.boundingBox(),
    ]);

    expect(
      workspaceBox,
    ).not.toBeNull();

    expect(
      problemBox,
    ).not.toBeNull();

    expect(
      editorBox,
    ).not.toBeNull();

    if (
      workspaceBox === null
      || problemBox === null
      || editorBox === null
    ) {
      continue;
    }

    await expect
      .poll(
        () =>
          page.evaluate(
            () =>
              document.documentElement.scrollWidth
              <= window.innerWidth,
          ),
      )
      .toBe(
        true,
      );

    if (
      width >= 1024
    ) {
      expect(
        Math.abs(
          problemBox.y
          - editorBox.y,
        ),
      ).toBeLessThan(
        4,
      );

      expect(
        problemBox.x,
      ).toBeLessThan(
        editorBox.x,
      );
    } else {
      expect(
        editorBox.y,
      ).toBeGreaterThan(
        problemBox.y,
      );
    }

    expect(
      workspaceBox.width,
    ).toBeLessThanOrEqual(
      width + 1,
    );
  }

  await page
    .getByRole(
      'button',
      {
        name:
          'Usar editor de texto simple',
      },
    )
    .click();

  const editor =
    page.getByRole(
      'textbox',
      {
        name:
          'Editor de código',
      },
    );

  await editor.fill(
    FIX_CODE_SOLUTION,
  );

  await page
    .getByRole(
      'button',
      {
        name:
          'Comprobar',
      },
    )
    .click();

  await expect(
    page.getByText(
      'Solución correcta. Todos los tests privados del servidor han pasado.',
    ),
  ).toBeVisible();

  await expect(
    page.getByText(
      'Respuesta correcta',
    ),
  ).toBeVisible();

  await page
    .getByRole(
      'button',
      {
        name:
          'Terminar sesión',
      },
    )
    .click();

  await expect(
    page.getByText(
      'Práctica completada',
    ),
  ).toBeVisible();

  await expect(
    page.getByRole(
      'heading',
      {
        name:
          'Progreso guardado',
      },
    ),
  ).toBeVisible();

  await expect(
    page.getByRole(
      'heading',
      {
        name:
          '¡Sesión completada!',
      },
    ),
  ).toHaveCount(
    0,
  );

  await expect(
    page.getByRole(
      'link',
      {
        name:
          'Ver resultados',
      },
    ),
  ).toHaveCount(
    0,
  );

  await expect(
    page.locator(
      '[data-confetti-mode="complete"]',
    ),
  ).toHaveCount(
    0,
  );

  const continueJourney =
    page.getByRole(
      'link',
      {
        name:
          'Continuar recorrido',
      },
    );

  await expect(
    continueJourney,
  ).toHaveAttribute(
    'href',
    '/tech/javascript/js-arrays',
  );

  await continueJourney.click();

  await expect(
    page,
  ).toHaveURL(
    '/tech/javascript/js-arrays',
  );
  await page
    .getByRole('complementary', { name: 'Barra lateral' })
    .getByRole('link', { name: 'Progreso' })
    .click();
  await expect(page).toHaveURL('/dashboard');
  await expect(page.getByRole('heading', { name: 'Progreso', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Actividad reciente' })).toBeVisible();
  for (const width of [320, 390, 768, 1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.getByRole('heading', { name: 'Progreso', exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  }
  await page.locator('a[href="/tech/javascript"]', { hasText: 'Ver tecnología' }).click();
  await expect(page).toHaveURL('/tech/javascript');
});
