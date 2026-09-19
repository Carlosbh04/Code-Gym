import {
  expect,
  test,
} from './fixtures';

const legacyTopics = [
  [
    'js-closures',
    'Closures',
  ],
  [
    'js-promises',
    'Promises',
  ],
  [
    'js-objects',
    'Objects',
  ],
  [
    'js-es6-plus',
    'ES6+',
  ],
  [
    'js-errors',
    'Errors',
  ],
] as const;

test.describe(
  'Arrays staged learning discovery',
  () => {
    test.use({
      authScenario:
        'main-flow',
    });

    test(
      'Arrays expone teoría y una práctica disponible',
      async ({
        page,
      }) => {
        test.setTimeout(
          45_000,
        );

        await page.goto(
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

        await expect(
          page.getByRole(
            'region',
            {
              name:
                'Teoría y conceptos',
            },
          ),
        ).toContainText(
          /\S+/,
          {
            timeout:
              15_000,
          },
        );

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

        const practiceCard =
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
          practiceCard,
        ).toBeVisible({
          timeout:
            15_000,
        });

        await practiceCard
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
            'button',
            {
              name:
                'Comprobar',
            },
          ),
        ).toBeVisible();
      },
    );
  },
);

test.describe(
  'Functions staged learning discovery',
  () => {
    test.use({
      authScenario:
        'main-flow',
    });

    test(
      'Functions expone Foundation staged',
      async ({
        page,
      }) => {
        test.setTimeout(
          45_000,
        );

        await page.goto(
          '/tech/javascript/js-functions',
        );

        await expect(
          page.getByRole(
            'heading',
            {
              level: 1,
              name:
                'Functions',
            },
          ),
        ).toBeVisible();

        await expect(
          page.getByRole(
            'region',
            {
              name:
                'Teoría y conceptos',
            },
          ),
        ).toContainText(
          /\S+/,
          {
            timeout:
              15_000,
          },
        );

        await expect(
          page.getByRole(
            'heading',
            {
              level: 2,
              name:
                'Parámetros, ámbito y retorno',
            },
          ),
        ).toBeVisible();

        const navigation =
          page.getByRole(
            'navigation',
            {
              name:
                'Etapas del aprendizaje',
            },
          );

        await expect(
          navigation,
        ).toBeVisible({
          timeout:
            15_000,
        });

        await expect(
          page.getByText(
            'Fundamentos de una función',
            {
              exact:
                true,
            },
          ),
        ).toBeVisible();

        await expect(
          page.getByText(
            'El valor por defecto solo se activa con undefined',
            {
              exact:
                true,
            },
          ),
        ).toBeVisible();

        await expect(
          navigation.getByRole(
            'button',
            {
              name:
                /Test/,
            },
          ),
        ).toBeDisabled();

        await expect(
          navigation.getByRole(
            'button',
            {
              name:
                /Práctica/,
            },
          ),
        ).toBeDisabled();

        await expect(
          navigation.getByRole(
            'button',
            {
              name:
                /Checkpoint/,
            },
          ),
        ).toBeDisabled();

        await expect(
          page.getByRole(
            'heading',
            {
              name:
                'Sesiones disponibles',
            },
          ),
        ).toHaveCount(
          0,
        );
      },
    );
  },
);

for (
  const [
    topicId,
    topicName,
  ]
  of legacyTopics
) {
  test(
    `${topicName} expone su teoría legacy sin inventar una práctica`,
    async ({
      page,
    }) => {
      test.setTimeout(
        45_000,
      );

      await page.goto(
        `/tech/javascript/${topicId}`,
      );

      await expect(
        page.getByRole(
          'heading',
          {
            level: 1,
            name:
              topicName,
          },
        ),
      ).toBeVisible();

      await expect(
        page.getByRole(
          'region',
          {
            name:
              /Teoría de/,
          },
        ).first(),
      ).toContainText(
        /\S+/,
        {
          timeout:
            15_000,
        },
      );

      // LEGACY_TOPIC_THEORY_ONLY_CONTRACT
      await expect(
        page.getByRole(
          'heading',
          {
            name:
              'Sesiones disponibles',
          },
        ),
      ).toHaveCount(
        0,
      );

      /*
       * LEGACY_TOPIC_THEORY_ONLY_CONTRACT
       *
       * No comprobamos globalmente "Empezar práctica":
       * la página puede contener CTAs pertenecientes a
       * otras superficies. El contrato de este topic es
       * que su workspace legacy no exponga el antiguo
       * bloque "Sesiones disponibles".
       */
    },
  );
}
