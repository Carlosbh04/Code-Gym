import { expect, test } from './fixtures';

const curricula = [
  [
    'JavaScript',
    'Arrays',
    'js-arrays',
    'js-array-iteration',
  ],
  [
    'HTML',
    'Estructura de documentos',
    'html-document',
    'html-document-basics',
  ],
  [
    'CSS',
    'Cascade y especificidad',
    'css-cascade',
    'css-cascade-specificity',
  ],
  [
    'React',
    'Componentes',
    'react-components',
    'react-components-basics',
  ],
  [
    'Node.js',
    'Módulos',
    'node-modules',
    'node-modules-imports',
  ],
  [
    'SQL',
    'SELECT',
    'sql-select',
    'sql-select-columns',
  ],
] as const;

test.describe('descubrimiento del currículo ampliado', () => {
  test.describe.configure({ mode: 'parallel' });

  for (
    const [
      technology,
      topic,
      topicId,
      targetConceptId,
    ]
    of curricula
  ) {
    test.describe(
      technology,
      () => {
        test.use({
          authTargetConceptId:
            targetConceptId,
        });

        test(`${technology} descubre teoría estructurada y práctica desde Entrenar`, async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL('/');
    await page
      .getByRole('complementary', { name: 'Barra lateral' })
      .getByRole('link', { name: 'Entrenar' })
      .click();
    await expect(page).toHaveURL('/tech');

    await page
      .getByRole('main')
      .getByRole('link', { name: new RegExp(`^${technology}(?:\\s|$)`, 'i') })
      .click();
    await expect(page.getByRole('heading', { level: 1, name: technology })).toBeVisible();
    const topicLink = page.locator(`a[href="/tech/${technology.toLowerCase().replace('.', '')}/${topicId}"]`);
    await topicLink.focus();
    await page.keyboard.press('Enter');
    await expect(
      page.getByRole('heading', { level: 1, name: topic }),
    ).toBeVisible();

    /*
     * CONTRATO ACTUAL DE DESCUBRIMIENTO
     *
     * El currículo puede usar:
     * - LearningWorkspace staged; o
     * - superficie legacy aún no migrada.
     *
     * No acoplamos este smoke test a títulos decorativos
     * como «Teoría y conceptos».
     */
    await expect(
      page.locator('main'),
    ).toBeVisible();

    await expect(
      page.getByRole(
        'heading',
        {
          level: 1,
        },
      ).first(),
    ).toBeVisible();

    const stagedWorkspace =
      page.getByRole(
        'navigation',
        {
          name:
            'Etapas del aprendizaje',
        },
      );

    const legacyTheory =
      page.getByRole(
        'region',
        {
          name:
            /Teoría de/i,
        },
      ).first();

    await expect
      .poll(
        async () => {
          const stagedVisible =
            await stagedWorkspace
              .isVisible()
              .catch(
                () => false,
              );

          const legacyVisible =
            await legacyTheory
              .isVisible()
              .catch(
                () => false,
              );

          return (
            stagedVisible
            || legacyVisible
          );
        },
        {
          timeout:
            15_000,
        },
      )
      .toBe(
        true,
      );

    if (
      await stagedWorkspace
        .isVisible()
        .catch(
          () => false,
        )
    ) {
      const stageButtons =
        stagedWorkspace
          .getByRole(
            'button',
          );

      await expect(
        stageButtons.first(),
      ).toBeVisible();

      expect(
        await stageButtons.count(),
      ).toBeGreaterThanOrEqual(
        4,
      );
    } else {
      await expect(
        legacyTheory,
      ).toBeVisible();

      const practiceAction =
        page.getByRole(
          'link',
          {
            name:
              /Empezar práctica|Entrenar/i,
          },
        ).first();

      await expect(
        practiceAction,
      ).toBeVisible();
    }

        });
      },
    );
  }
});
