import {
  spawnSync,
} from 'node:child_process';

import {
  createPrismaClient,
} from '../../src/database/prisma.js';

import {
  loadConfig,
} from '../../src/config/load-config.js';

const ARRAYS_CONCEPT_ID =
  'js-array-iteration';

const EXPECTED_ARRAYS_LEVELS =
  3;

const EXPECTED_ARRAYS_SECTIONS =
  54;

const EXPECTED_ARRAYS_SESSIONS =
  18;

interface CatalogState {
  readonly conceptExists:
    boolean;

  readonly levels:
    number;

  readonly sections:
    number;

  readonly sessions:
    number;
}

function assertTestDatabase(): void {
  const config =
    loadConfig();

  if (
    !config.isTest
    || !config.database.name
      .endsWith(
        '_test',
      )
  ) {
    throw new Error(
      'E2E catalog bootstrap requires NODE_ENV=test and a database ending in _test',
    );
  }

  if (
    config.database.name
    === 'codegym'
  ) {
    throw new Error(
      'Refusing to bootstrap the production/development CodeGym database',
    );
  }
}

async function readCatalogState():
  Promise<CatalogState> {
  const config =
    loadConfig();

  const prisma =
    createPrismaClient(
      config.database,
    );

  try {
    const [
      concept,
      levels,
      sections,
      sessions,
    ] =
      await Promise.all([
        prisma.concept.findUnique({
          where: {
            id:
              ARRAYS_CONCEPT_ID,
          },

          select: {
            id:
              true,
          },
        }),

        prisma
          .conceptLearningLevel
          .count({
            where: {
              conceptId:
                ARRAYS_CONCEPT_ID,
            },
          }),

        prisma
          .learningSection
          .count({
            where: {
              conceptId:
                ARRAYS_CONCEPT_ID,
            },
          }),

        prisma
          .exerciseSession
          .count({
            where: {
              conceptId:
                ARRAYS_CONCEPT_ID,
            },
          }),
      ]);

    return {
      conceptExists:
        concept !== null,

      levels,

      sections,

      sessions,
    };
  } finally {
    await prisma.$disconnect();
  }
}

function isCatalogReady(
  state: CatalogState,
): boolean {
  return (
    state.conceptExists
    && state.levels
      === EXPECTED_ARRAYS_LEVELS
    && state.sections
      === EXPECTED_ARRAYS_SECTIONS
    && state.sessions
      === EXPECTED_ARRAYS_SESSIONS
  );
}

async function assertImportIsSafe():
  Promise<void> {
  const config =
    loadConfig();

  const prisma =
    createPrismaClient(
      config.database,
    );

  try {
    const [
      levelProgress,
      conceptProgress,
    ] =
      await Promise.all([
        prisma
          .conceptLearningLevelProgress
          .count(),

        prisma
          .conceptLearningProgress
          .count(),
      ]);

    if (
      levelProgress > 0
      || conceptProgress > 0
    ) {
      throw new Error(
        [
          'The E2E static catalog is incomplete,',
          'but learning progress already exists.',
          'Refusing to re-import because the importer',
          'recreates learning-level catalog rows.',
          `levelProgress=${String(levelProgress)}`,
          `conceptProgress=${String(conceptProgress)}`,
        ].join(
          ' ',
        ),
      );
    }
  } finally {
    await prisma.$disconnect();
  }
}

function importStaticCatalog():
  void {
  const result =
    spawnSync(
      process.execPath,
      [
        '--import',
        'tsx',
        'scripts/content/import-static-catalog.ts',
      ],
      {
        cwd:
          process.cwd(),

        env:
          process.env,

        stdio:
          'inherit',
      },
    );

  if (
    result.error
    !== undefined
  ) {
    throw result.error;
  }

  if (
    result.status !== 0
  ) {
    throw new Error(
      `Static catalog importer exited with status ${String(result.status)}`,
    );
  }
}

async function main():
  Promise<void> {
  assertTestDatabase();

  const before =
    await readCatalogState();

  console.log(
    'E2E catalog before:',
    before,
  );

  if (
    isCatalogReady(
      before,
    )
  ) {
    console.log(
      'E2E static catalog already ready',
    );

    return;
  }

  await assertImportIsSafe();

  console.log(
    'E2E static catalog missing or incomplete; importing canonical catalog',
  );

  importStaticCatalog();

  const after =
    await readCatalogState();

  console.log(
    'E2E catalog after:',
    after,
  );

  if (
    !isCatalogReady(
      after,
    )
  ) {
    throw new Error(
      [
        'Static catalog import finished,',
        'but Arrays does not match',
        'the expected E2E contract:',
        JSON.stringify(
          after,
        ),
      ].join(
        ' ',
      ),
    );
  }

  console.log(
    'E2E static catalog bootstrap: OK',
  );
}

await main();
