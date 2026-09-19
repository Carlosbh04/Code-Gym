import { expect, test, type Page } from './fixtures';


test.use({
  authScenario:
    'topic-recovery',
});

const SESSION_ID = 'js-arrays-map-vs-foreach-01';
const REQUESTED_SESSION_ID = 'js-arrays-filter-mutation-01';
const BREAKPOINTS = [320, 390, 768, 1024, 1280, 1440] as const;

async function startPartialSession(page: Page) {
  await page.goto(
    `/practice/${SESSION_ID}`,
  );

  await expect(
    page.getByRole(
      'heading',
      {
        name:
          'forEach no devuelve lo que crees',
      },
    ),
  ).toBeVisible();

  await expect
    .poll(
      async () =>
        page.evaluate(() => {
          const raw =
            sessionStorage.getItem(
              'codegym:session',
            );

          if (raw === null) {
            return false;
          }

          const snapshot =
            JSON.parse(raw) as {
              trainingRunId?: unknown;
            };

          return (
            typeof snapshot.trainingRunId
              === 'string'
            && snapshot.trainingRunId.length
              > 0
          );
        }),
      {
        timeout:
          15_000,
      },
    )
    .toBe(true);

  const canonical =
    await page.evaluate(() => {
      const raw =
        sessionStorage.getItem(
          'codegym:session',
        );

      if (raw === null) {
        throw new Error(
          'Missing canonical recovery snapshot',
        );
      }

      return JSON.parse(raw) as {
        sessionId:
          string;
        trainingRunId:
          string;
        elapsedMs:
          number;
        startTime:
          number;
      };
    });

  expect(
    canonical.sessionId,
  ).toBe(
    SESSION_ID,
  );

  expect(
    canonical.trainingRunId,
  ).not.toHaveLength(0);

  await page.addInitScript(
    ({
      snapshot,
      sessionId,
    }) => {
      const now =
        Date.now();

      sessionStorage.setItem(
        'codegym:session',
        JSON.stringify({
          ...snapshot,
          sessionId,
          currentStep:
            1,
          answers: [
            {
              stepId:
                'step-1',
              stepType:
                'code-reading',
              answer:
                'b',
              isCorrect:
                true,
              timeSpentMs:
                1_000,
              hintsUsed:
                0,
            },
          ],
          elapsedMs:
            Math.max(
              snapshot.elapsedMs,
              1_000,
            ),
          revealedHints:
            [],
          startTime:
            snapshot.startTime,
          lastActivityAt:
            now,
        }),
      );
    },
    {
      snapshot:
        canonical,
      sessionId:
        SESSION_ID,
    },
  );

  await page.goto(
    `/practice/${REQUESTED_SESSION_ID}`,
  );

  await expect(
    page,
  ).toHaveURL(
    `/practice/${REQUESTED_SESSION_ID}`,
  );

  await expect(
    page.getByRole(
      'dialog',
      {
        name:
          'Tienes una sesión incompleta',
      },
    ),
  ).toBeVisible({
    timeout:
      15_000,
  });
}

test('muestra recovery real, responde en seis breakpoints y continúa donde se dejó', async ({ page }) => {
  test.setTimeout(60_000);
  await startPartialSession(page);

  const dialog = page.getByRole('dialog', { name: 'Tienes una sesión incompleta' });
  await expect(dialog.getByText('JavaScript', { exact: true })).toBeVisible();
  await expect(dialog.getByText('forEach no devuelve lo que crees', { exact: true })).toBeVisible();
  await expect(dialog.getByText('Arrays · Métodos de iteración de arrays', { exact: true })).toBeVisible();
  await expect(dialog.getByText('Paso 2 de 4')).toBeVisible();
  await expect(dialog.getByText('25%')).toBeVisible();
  await expect(dialog.getByText('1 de 4 ejercicios')).toBeVisible();
  await expect(dialog.getByText(/Última actividad: (ahora|hace 1 minuto)/)).toBeVisible();
  await expect(dialog.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');
  await expect(dialog.getByRole('progressbar')).toHaveAttribute('aria-valuemax', '4');

  for (const width of BREAKPOINTS) {
    await page.setViewportSize({ width, height: 900 });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const box = await dialog.boundingBox();
    expect(box).not.toBeNull();
    if (box === null) continue;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(width + 1);
    expect(Math.abs(box.x + box.width / 2 - width / 2)).toBeLessThan(3);

    const continueBox = await dialog.getByRole('button', { name: 'Continuar' }).boundingBox();
    const restartBox = await dialog.getByRole('button', { name: 'Empezar de nuevo' }).boundingBox();
    expect(continueBox).not.toBeNull();
    expect(restartBox).not.toBeNull();
    if (continueBox === null || restartBox === null) continue;
    if (width >= 768) {
      expect(Math.abs(continueBox.y - restartBox.y)).toBeLessThan(2);
    } else {
      expect(restartBox.y).toBeGreaterThan(continueBox.y);
    }
  }

  await dialog.getByRole('button', { name: 'Continuar' }).click();

  await expect(
    page,
  ).toHaveURL(
    `/practice/${SESSION_ID}`,
  );

  await expect(
    page.getByText(
      'Paso 2 de 4',
    ),
  ).toBeVisible();
  const restored = await page.evaluate(() => JSON.parse(sessionStorage.getItem('codegym:session') ?? 'null'));
  expect(restored).toMatchObject({ sessionId: SESSION_ID, currentStep: 1 });
  expect(restored.answers).toHaveLength(1);
});

test('Empezar de nuevo descarta el recovery y crea una sesión limpia', async ({ page }) => {
  test.setTimeout(60_000);
  await startPartialSession(page);

  const dialog = page.getByRole('dialog', { name: 'Tienes una sesión incompleta' });
  await dialog.getByRole('button', { name: 'Empezar de nuevo' }).click();

  await expect(
    page,
  ).toHaveURL(
    `/practice/${REQUESTED_SESSION_ID}`,
  );

  await expect(
    page.getByText(
      'Paso 1 de 4',
    ),
  ).toBeVisible();
  await expect.poll(() => page.evaluate(
    () => JSON.parse(sessionStorage.getItem('codegym:session') ?? 'null'),
  )).not.toBeNull();
  const snapshot = await page.evaluate(() => JSON.parse(sessionStorage.getItem('codegym:session') ?? 'null'));
  expect(snapshot).toMatchObject({
    sessionId:
      REQUESTED_SESSION_ID,
    currentStep:
      0,
    answers:
      [],
  });
  expect(typeof snapshot.lastActivityAt).toBe('number');
});
