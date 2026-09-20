import {
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs';
import {
  dirname,
  join,
  resolve,
} from 'node:path';
import {
  fileURLToPath,
} from 'node:url';

const SCRIPT_DIRECTORY =
  dirname(fileURLToPath(import.meta.url));

const FRONTEND_ROOT =
  resolve(SCRIPT_DIRECTORY, '../frontend');

const CONTENT_ROOT =
  join(FRONTEND_ROOT, 'src/data/content');

const commandArguments =
  process.argv.slice(2);

const CHECK_MODE =
  commandArguments.includes(
    '--check',
  );

const backendRootArgument =
  commandArguments.find(
    (argument) =>
      argument !== '--check',
  );

if (
  backendRootArgument === undefined
  || backendRootArgument.trim() === ''
) {
  throw new Error(
    'Uso: node scripts/generate-verifier-manifest.mjs <backend-root> [--check]',
  );
}

const BACKEND_ROOT =
  resolve(process.cwd(), backendRootArgument);

const OUTPUT_PATH =
  join(
    BACKEND_ROOT,
    'src/content/generated/verifier-manifest.ts',
  );

function readJson(path) {
  return JSON.parse(
    readFileSync(path, 'utf8'),
  );
}

function directories(path) {
  return readdirSync(
    path,
    {
      withFileTypes: true,
    },
  )
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

function jsonFiles(path) {
  return readdirSync(
    path,
    {
      withFileTypes: true,
    },
  )
    .filter(
      (entry) =>
        entry.isFile()
        && entry.name.endsWith('.json'),
    )
    .map((entry) => entry.name)
    .sort();
}

function requireNonEmptyString(
  value,
  field,
) {
  if (
    typeof value !== 'string'
    || value.trim() === ''
  ) {
    throw new Error(
      `${field} debe ser un string no vacío`,
    );
  }

  return value;
}

function requireArray(
  value,
  field,
) {
  if (!Array.isArray(value)) {
    throw new Error(
      `${field} debe ser un array`,
    );
  }

  return value;
}

function buildHints(
  session,
  step,
) {
  return requireArray(
    step.hints,
    `${session.id}/${step.id}: hints`,
  ).map(
    (hint, index) =>
      requireNonEmptyString(
        hint,
        `${session.id}/${step.id}: hints[${index}]`,
      ),
  );
}

function buildConceptIndex() {
  const concepts =
    new Map();

  for (
    const technologyDirectory
    of directories(CONTENT_ROOT)
  ) {
    const technologyPath =
      join(
        CONTENT_ROOT,
        technologyDirectory,
      );

    for (
      const conceptDirectory
      of directories(technologyPath)
    ) {
      const conceptPath =
        join(
          technologyPath,
          conceptDirectory,
        );

      const metadataPath =
        join(
          conceptPath,
          'index.json',
        );

      const metadata =
        readJson(metadataPath);

      const conceptId =
        requireNonEmptyString(
          metadata.id,
          `${metadataPath}: id`,
        );

      const topicId =
        requireNonEmptyString(
          metadata.topicId,
          `${metadataPath}: topicId`,
        );

      const technologyId =
        requireNonEmptyString(
          metadata.technologyId,
          `${metadataPath}: technologyId`,
        );

      if (
        concepts.has(conceptId)
      ) {
        throw new Error(
          `Concepto duplicado: ${conceptId}`,
        );
      }

      concepts.set(
        conceptId,
        {
          conceptId,
          topicId,
          technologyId,
          conceptPath,
        },
      );
    }
  }

  return concepts;
}

function buildOptionStep(
  session,
  step,
) {
  const options =
    requireArray(
      step.options,
      `${session.id}/${step.id}: options`,
    );

  const correctOptionIds =
    options
      .filter(
        (option) =>
          option?.correct === true,
      )
      .map(
        (option) =>
          requireNonEmptyString(
            option.id,
            `${session.id}/${step.id}: option.id`,
          ),
      );

  if (
    correctOptionIds.length !== 1
  ) {
    throw new Error(
      `${session.id}/${step.id} debe declarar exactamente una opción correcta`,
    );
  }

  return {
    id:
      requireNonEmptyString(
        step.id,
        `${session.id}: step.id`,
      ),
    type:
      step.type,
    correctOptionIds,
    hints:
      buildHints(
        session,
        step,
      ),
  };
}

function buildFindErrorStep(
  session,
  step,
) {
  const errorLines =
    requireArray(
      step.errorLines,
      `${session.id}/${step.id}: errorLines`,
    );

  if (
    errorLines.length === 0
    || !errorLines.every(
      (line) =>
        Number.isSafeInteger(line)
        && line > 0,
    )
  ) {
    throw new Error(
      `${session.id}/${step.id} contiene errorLines inválidas`,
    );
  }

  return {
    id:
      requireNonEmptyString(
        step.id,
        `${session.id}: step.id`,
      ),
    type:
      'find-error',
    errorLines,
    errorType:
      requireNonEmptyString(
        step.errorType,
        `${session.id}/${step.id}: errorType`,
      ),
    hints:
      buildHints(
        session,
        step,
      ),
  };
}

function buildFixCodeStep(
  session,
  step,
) {
  const testCases =
    requireArray(
      step.testCases,
      `${session.id}/${step.id}: testCases`,
    );

  if (testCases.length === 0) {
    throw new Error(
      `${session.id}/${step.id} no contiene testCases`,
    );
  }

  return {
    id:
      requireNonEmptyString(
        step.id,
        `${session.id}: step.id`,
      ),
    type:
      'fix-code',
    testCases,
    hints:
      buildHints(
        session,
        step,
      ),
  };
}

function buildStep(
  session,
  step,
) {
  switch (step.type) {
    case 'code-reading':
    case 'predict-output':
      return buildOptionStep(
        session,
        step,
      );

    case 'find-error':
      return buildFindErrorStep(
        session,
        step,
      );

    case 'fix-code':
      return buildFixCodeStep(
        session,
        step,
      );

    default:
      throw new Error(
        `${session.id}/${String(step.id)} usa un tipo de ejercicio desconocido: ${String(step.type)}`,
      );
  }
}

function buildManifest() {
  const concepts =
    buildConceptIndex();

  const sessions = [];

  for (
    const concept
    of concepts.values()
  ) {
    const sessionsPath =
      join(
        concept.conceptPath,
        'sessions',
      );

    let sessionFiles;

    try {
      sessionFiles =
        jsonFiles(sessionsPath);
    } catch {
      continue;
    }

    for (
      const sessionFile
      of sessionFiles
    ) {
      const sessionPath =
        join(
          sessionsPath,
          sessionFile,
        );

      const session =
        readJson(sessionPath);

      const sessionId =
        requireNonEmptyString(
          session.id,
          `${sessionPath}: id`,
        );

      if (
        session.conceptId
        !== concept.conceptId
      ) {
        throw new Error(
          `${sessionId}: conceptId no coincide con ${concept.conceptId}`,
        );
      }

      if (
        session.technologyId
        !== concept.technologyId
      ) {
        throw new Error(
          `${sessionId}: technologyId no coincide con ${concept.technologyId}`,
        );
      }

      const rawSteps =
        requireArray(
          session.steps,
          `${sessionId}: steps`,
        );

      if (
        rawSteps.length === 0
      ) {
        throw new Error(
          `${sessionId} no contiene ejercicios`,
        );
      }

      const steps =
        rawSteps.map(
          (step) =>
            buildStep(
              session,
              step,
            ),
        );

      const stepIds =
        new Set();

      for (
        const step
        of steps
      ) {
        if (
          stepIds.has(step.id)
        ) {
          throw new Error(
            `${sessionId}: exerciseId duplicado ${step.id}`,
          );
        }

        stepIds.add(step.id);
      }

      sessions.push({
        id:
          sessionId,
        technologyId:
          concept.technologyId,
        topicId:
          concept.topicId,
        conceptId:
          concept.conceptId,
        status:
          requireNonEmptyString(
            session.status,
            `${sessionId}: status`,
          ),
        totalExercises:
          steps.length,
        steps,
      });
    }
  }

  sessions.sort(
    (left, right) =>
      left.id.localeCompare(
        right.id,
      ),
  );

  const sessionIds =
    new Set();

  for (
    const session
    of sessions
  ) {
    if (
      sessionIds.has(
        session.id,
      )
    ) {
      throw new Error(
        `SessionId duplicado: ${session.id}`,
      );
    }

    sessionIds.add(
      session.id,
    );
  }

  return {
    schemaVersion: 1,
    sessions,
  };
}

function buildManifestSource(
  manifest,
) {
  return `/*
 * GENERATED FILE.
 *
 * Source of truth:
 *   codeGYM/src/data/content
 *
 * Do not edit manually.
 */

export const verifierManifest = ${JSON.stringify(
  manifest,
  null,
  2,
)} as const;
`;
}

const manifest =
  buildManifest();

const source =
  buildManifestSource(
    manifest,
  );

if (CHECK_MODE) {
  let currentSource;

  try {
    currentSource =
      readFileSync(
        OUTPUT_PATH,
        'utf8',
      );
  } catch {
    throw new Error(
      `Verifier manifest ausente: ${OUTPUT_PATH}`,
    );
  }

  if (currentSource !== source) {
    throw new Error(
      [
        'Verifier manifest desactualizado.',
        'Regenera explícitamente con:',
        '  npm run content:manifest:generate',
        `Archivo: ${OUTPUT_PATH}`,
      ].join('\n'),
    );
  }

  console.log(
    `Verifier manifest actualizado: ${manifest.sessions.length} sesiones`,
  );

  console.log(
    OUTPUT_PATH,
  );

  process.exit(0);
}

mkdirSync(
  dirname(OUTPUT_PATH),
  {
    recursive: true,
  },
);

writeFileSync(
  OUTPUT_PATH,
  source,
  'utf8',
);

console.log(
  `Verifier manifest generado: ${manifest.sessions.length} sesiones`,
);

console.log(
  OUTPUT_PATH,
);
