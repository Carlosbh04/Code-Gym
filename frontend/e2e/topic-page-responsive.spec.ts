import {
  expect,
  test,
  type Page,
} from './fixtures';

const BREAKPOINTS = [
  320,
  390,
  768,
  1024,
  1280,
  1440,
] as const;

test.use({
  authTargetConceptId:
    'js-array-iteration',
});

async function expectNoHorizontalOverflow(
  page: Page,
) {
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
}

test(
  'TopicPage conserva el LearningWorkspace en seis breakpoints',
  async ({
    page,
  }) => {
    test.setTimeout(
      60_000,
    );

    await page.goto(
      '/tech/javascript/js-arrays',
    );

    await expect(
      page.getByRole(
        'heading',
        {
          level: 1,
          name: 'Arrays',
        },
      ),
    ).toBeVisible();

    const learningWorkspace =
      page.getByRole(
        'region',
        {
          name:
            'Teoría y conceptos',
        },
      );

    await expect(
      learningWorkspace,
    ).toBeVisible({
      timeout: 15_000,
    });

    await expect(
      page.getByRole(
        'heading',
        {
          name:
            'Métodos de iteración de arrays',
          level: 2,
        },
      ),
    ).toBeVisible();

    const stages =
      page.getByRole(
        'navigation',
        {
          name:
            'Etapas del aprendizaje',
        },
      );

    await expect(
      stages,
    ).toBeVisible();

    await expect(
      stages.getByRole(
        'button',
        {
          name: /Teoría/,
        },
      ),
    ).toBeVisible();

    await expect(
      stages.getByRole(
        'button',
        {
          name: /Test/,
        },
      ),
    ).toBeVisible();

    await expect(
      stages.getByRole(
        'button',
        {
          name: /Práctica/,
        },
      ),
    ).toBeVisible();

    await expect(
      stages.getByRole(
        'button',
        {
          name: /Checkpoint/,
        },
      ),
    ).toBeVisible();

    await expect(
      page.getByRole(
        'button',
        {
          name:
            'He entendido esto',
        },
      ),
    ).toBeVisible();

    for (
      const width
      of BREAKPOINTS
    ) {
      await page.setViewportSize({
        width,
        height: 1000,
      });

      await expectNoHorizontalOverflow(
        page,
      );

      await expect(
        learningWorkspace,
      ).toBeVisible();

      await expect(
        stages,
      ).toBeVisible();

      const workspaceBox =
        await learningWorkspace.boundingBox();

      const stagesBox =
        await stages.boundingBox();

      expect(
        workspaceBox,
      ).not.toBeNull();

      expect(
        stagesBox,
      ).not.toBeNull();

      if (
        workspaceBox === null
        || stagesBox === null
      ) {
        continue;
      }

      expect(
        workspaceBox.x,
      ).toBeGreaterThanOrEqual(
        0,
      );

      expect(
        workspaceBox.x
        + workspaceBox.width,
      ).toBeLessThanOrEqual(
        width + 1,
      );

      expect(
        stagesBox.x,
      ).toBeGreaterThanOrEqual(
        workspaceBox.x - 1,
      );

      expect(
        stagesBox.x
        + stagesBox.width,
      ).toBeLessThanOrEqual(
        workspaceBox.x
        + workspaceBox.width
        + 1,
      );
    }
  },
);

test.describe(
  'TopicPage con prerrequisitos reales',
  () => {
    test.use({
      authScenario:
        'topic-recovery',
    });

    test(
      'Entrenar abre una práctica disponible y vuelve como En progreso',
      async ({
        page,
      }) => {
        test.setTimeout(
          60_000,
        );

        await page.goto(
          '/tech',
        );

        await page
          .getByRole(
            'link',
            {
              name:
                /^JavaScript —/,
            },
          )
          .click();

        await expect(
          page,
        ).toHaveURL(
          '/tech/javascript',
        );

        await page
          .locator(
            'a[href="/tech/javascript/js-arrays"]',
          )
          .click();

        await expect(
          page,
        ).toHaveURL(
          '/tech/javascript/js-arrays',
        );

        await expect(
          page.getByRole(
            'heading',
            {
              level: 1,
              name:
                'Arrays',
            },
          ),
        ).toBeVisible();

        const sessionCard =
          page.locator(
            'article',
            {
              has:
                page.getByRole(
                  'heading',
                  {
                    name:
                      'forEach no devuelve lo que crees',
                  },
                ),
            },
          );

        await expect(
          sessionCard,
        ).toBeVisible({
          timeout: 15_000,
        });

        await sessionCard
          .getByRole(
            'link',
            {
              name:
                'Empezar práctica',
            },
          )
          .click();

        await expect(
          page,
        ).toHaveURL(
          '/practice/js-arrays-map-vs-foreach-01',
        );

        await expect(
          page.getByRole(
            'heading',
            {
              name:
                /forEach no devuelve/i,
            },
          ),
        ).toBeVisible();

        await expect(
          page.getByRole(
            'button',
            {
              name:
                'Comprobar',
            },
          ),
        ).toBeVisible();

        await expect
          .poll(
            () =>
              page.evaluate(
                () =>
                  sessionStorage.getItem(
                    'codegym:session',
                  )
                  !== null,
              ),
          )
          .toBe(
            true,
          );

        await page.goBack();

        await expect(
          page,
        ).toHaveURL(
          '/tech/javascript/js-arrays',
        );

        const resumedCard =
          page.locator(
            'article',
            {
              has:
                page.getByRole(
                  'heading',
                  {
                    name:
                      'forEach no devuelve lo que crees',
                  },
                ),
            },
          );

        await expect(
          resumedCard.getByText(
            'En progreso',
          ),
        ).toBeVisible();

        await expect(
          resumedCard.getByRole(
            'link',
            {
              name:
                'Continuar práctica',
            },
          ),
        ).toHaveAttribute(
          'href',
          '/practice/js-arrays-map-vs-foreach-01',
        );
      },
    );
  },
);
