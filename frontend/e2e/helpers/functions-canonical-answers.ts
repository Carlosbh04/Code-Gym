import {
  readdirSync,
  readFileSync,
} from 'node:fs';

import {
  fileURLToPath,
} from 'node:url';

type ExistingAnswer = {
  readonly exerciseId:
    string;

  readonly answer:
    unknown;
};

type CanonicalOption = {
  readonly id?:
    unknown;

  readonly correct?:
    unknown;
};

type CanonicalStep = {
  readonly id?:
    unknown;

  readonly type?:
    unknown;

  readonly options?:
    unknown;

  readonly errorType?:
    unknown;

  readonly errorLines?:
    unknown;
};

type CanonicalSession = {
  readonly id?:
    unknown;

  readonly steps?:
    unknown;

  readonly levelId?:
    unknown;

  readonly kind?:
    unknown;

  readonly position?:
    unknown;

  readonly status?:
    unknown;

  readonly requiredForProgression?:
    unknown;
};

const FUNCTIONS_SESSIONS_ROOT =
  fileURLToPath(
    new URL(
      '../../src/data/content/javascript/functions/sessions/',
      import.meta.url,
    ),
  );

let cachedSessions:
  ReadonlyMap<
    string,
    CanonicalSession
  >
  | undefined;

function loadCanonicalSessions():
ReadonlyMap<
  string,
  CanonicalSession
> {
  if (
    cachedSessions
    !== undefined
  ) {
    return cachedSessions;
  }

  const map =
    new Map<
      string,
      CanonicalSession
    >();

  for (
    const filename
    of readdirSync(
      FUNCTIONS_SESSIONS_ROOT,
    )
  ) {
    if (
      !filename.endsWith(
        '.json',
      )
    ) {
      continue;
    }

    const raw =
      readFileSync(
        new URL(
          `../../src/data/content/javascript/functions/sessions/${filename}`,
          import.meta.url,
        ),
        'utf8',
      );

    const session =
      JSON.parse(
        raw,
      ) as CanonicalSession;

    if (
      typeof session.id
      !== 'string'
      || session.id.length
      === 0
    ) {
      throw new Error(
        `Invalid Functions session id in ${filename}`,
      );
    }

    map.set(
      session.id,
      session,
    );
  }

  cachedSessions =
    map;

  return map;
}

function correctOptionId(
  step:
    CanonicalStep,
): string {
  if (
    !Array.isArray(
      step.options,
    )
  ) {
    throw new Error(
      `Canonical E2E step ${String(step.id)} has no options`,
    );
  }

  const correct =
    step.options.find(
      (option) =>
        option.correct
        === true,
    );

  if (
    correct === undefined
    || typeof correct.id
      !== 'string'
    || correct.id.length
      === 0
  ) {
    throw new Error(
      `Canonical E2E step ${String(step.id)} has no correct option`,
    );
  }

  return correct.id;
}

function errorLine(
  step:
    CanonicalStep,
  existing:
    ExistingAnswer
    | undefined,
): number {
  if (
    Array.isArray(
      step.errorLines,
    )
    && step.errorLines.length
      > 0
  ) {
    const first =
      step.errorLines[0];

    if (
      typeof first
      === 'number'
    ) {
      return first;
    }

    if (
      typeof first
      === 'object'
      && first !== null
      && 'line' in first
      && typeof first.line
        === 'number'
    ) {
      return first.line;
    }
  }

  if (
    existing !== undefined
    && typeof existing.answer
      === 'object'
    && existing.answer
      !== null
    && 'line'
      in existing.answer
  ) {
    const line =
      existing.answer.line;

    if (
      typeof line
      === 'number'
    ) {
      return line;
    }
  }

  throw new Error(
    `Canonical find-error step ${String(step.id)} has no usable error line`,
  );
}

export function canonicalFunctionsAnswers(
  sessionId:
    string,
  existingAnswers:
    readonly ExistingAnswer[],
): readonly ExistingAnswer[] {
  const session =
    loadCanonicalSessions()
      .get(
        sessionId,
      );

  if (
    session === undefined
  ) {
    throw new Error(
      `Functions E2E session not found in canonical content: ${sessionId}`,
    );
  }

  if (
    !Array.isArray(
      session.steps,
    )
  ) {
    throw new Error(
      `Functions E2E session has invalid steps: ${sessionId}`,
    );
  }

  const existingByStep =
    new Map(
      existingAnswers.map(
        (answer) => [
          answer.exerciseId,
          answer,
        ] as const,
      ),
    );

  return (
    session.steps
  ).map(
    (step) => {
      if (
        typeof step.id
        !== 'string'
        || step.id.length
        === 0
      ) {
        throw new Error(
          `Invalid canonical step in ${sessionId}`,
        );
      }

      const existing =
        existingByStep.get(
          step.id,
        );

      if (
        step.type
        === 'fix-code'
      ) {
        if (
          existing === undefined
        ) {
          throw new Error(
            `Missing fix-code E2E answer for ${sessionId}/${step.id}`,
          );
        }

        return existing;
      }

      if (
        step.type
          === 'code-reading'
        || step.type
          === 'predict-output'
      ) {
        return {
          exerciseId:
            step.id,

          answer:
            correctOptionId(
              step,
            ),
        };
      }

      if (
        step.type
        === 'find-error'
      ) {
        const errorType =
          typeof step.errorType
            === 'string'
            && step.errorType.length
              > 0
            ? step.errorType
            : correctOptionId(
                step,
              );

        return {
          exerciseId:
            step.id,

          answer: {
            line:
              errorLine(
                step,
                existing,
              ),

            errorType,
          },
        };
      }

      if (
        existing !== undefined
      ) {
        return existing;
      }

      throw new Error(
        `Unsupported canonical E2E step type ${String(step.type)} for ${sessionId}/${step.id}`,
      );
    },
  );
}

export function orderCanonicalFunctionPractices<
  T extends {
    readonly id: string;
  },
>(
  levelId: string,
  practices: readonly T[],
): readonly T[] {
  const sessions =
    loadCanonicalSessions();

  const expectedIds =
    [...sessions.values()]
      .filter(
        session =>
          session.levelId === levelId
          && session.kind === 'practice'
          && session.status === 'published'
          && session.requiredForProgression === true,
      )
      .sort(
        (left, right) =>
          Number(left.position)
          - Number(right.position),
      )
      .map(
        session =>
          String(session.id),
      );

  const byId =
    new Map(
      practices.map(
        practice => [
          practice.id,
          practice,
        ] as const,
      ),
    );

  const missing =
    expectedIds.filter(
      id =>
        !byId.has(id),
    );

  const extra =
    practices
      .map(practice => practice.id)
      .filter(
        id =>
          !expectedIds.includes(id),
      );

  if (
    missing.length > 0
    || extra.length > 0
  ) {
    throw new Error(
      `Functions ${levelId} E2E practices do not match canonical content: missing=${missing.join(',')} extra=${extra.join(',')}`,
    );
  }

  return expectedIds.map(
    id =>
      byId.get(id) as T,
  );
}
