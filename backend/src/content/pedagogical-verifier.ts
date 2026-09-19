export type RequiredArrayMethod =
  | 'filter'
  | 'map'
  | 'reduce';

export interface RequiredArrayMethodRequirement {
  readonly kind: 'required-array-method';
  readonly method: RequiredArrayMethod;
  readonly feedback: string;
}

export type PedagogicalRequirement =
  RequiredArrayMethodRequirement;

export interface PedagogicalVerificationResult {
  readonly requirementsMet: boolean;
  readonly feedback: readonly string[];
}

export interface CombinedVerificationResult {
  readonly functionalCorrect: boolean;
  readonly pedagogicalRequirementsMet: boolean;
  readonly overallPassed: boolean;
  readonly feedback: readonly string[];
}

export function evaluatePedagogicalRequirements(
  sourceCode: string,
  requirements:
    readonly PedagogicalRequirement[],
): PedagogicalVerificationResult {
  if (requirements.length === 0) {
    return Object.freeze({
      requirementsMet: true,
      feedback: Object.freeze([]),
    });
  }

  const analyzableSource =
    stripCommentsAndStrings(
      sourceCode,
    );

  const failedFeedback:
    string[] = [];

  for (
    const requirement
    of requirements
  ) {
    switch (requirement.kind) {
      case 'required-array-method': {
        if (
          !usesArrayMethod(
            analyzableSource,
            requirement.method,
          )
        ) {
          failedFeedback.push(
            requirement.feedback,
          );
        }

        break;
      }
    }
  }

  return Object.freeze({
    requirementsMet:
      failedFeedback.length === 0,

    feedback:
      Object.freeze(
        failedFeedback,
      ),
  });
}

export function combineVerificationResult(
  functionalCorrect: boolean,
  pedagogical:
    PedagogicalVerificationResult,
): CombinedVerificationResult {
  return Object.freeze({
    functionalCorrect,

    pedagogicalRequirementsMet:
      pedagogical.requirementsMet,

    overallPassed:
      functionalCorrect
      && pedagogical.requirementsMet,

    feedback:
      pedagogical.feedback,
  });
}

function usesArrayMethod(
  sourceCode: string,
  method: RequiredArrayMethod,
): boolean {
  const escapedMethod =
    escapeRegExp(
      method,
    );

  const pattern =
    new RegExp(
      String.raw`(?:\.|\?\.)\s*${escapedMethod}\s*\(`,
      'u',
    );

  return pattern.test(
    sourceCode,
  );
}

function escapeRegExp(
  value: string,
): string {
  return value.replace(
    /[.*+?^${}()|[\]\\]/gu,
    '\\$&',
  );
}

/**
 * Removes comments and string/template contents before checking
 * pedagogical source requirements.
 *
 * This prevents a learner from satisfying a requirement merely by
 * writing something such as:
 *
 *   // use .filter(...)
 *
 * The checker is intentionally small and conservative. It is not a
 * JavaScript parser and must not be used as a security boundary.
 */
function stripCommentsAndStrings(
  source: string,
): string {
  let output = '';
  let index = 0;

  while (index < source.length) {
    const char = source[index];
    const next = source[index + 1];

    if (
      char === '/'
      && next === '/'
    ) {
      output += '  ';
      index += 2;

      while (
        index < source.length
        && source[index] !== '\n'
      ) {
        output += ' ';
        index += 1;
      }

      continue;
    }

    if (
      char === '/'
      && next === '*'
    ) {
      output += '  ';
      index += 2;

      while (
        index < source.length
      ) {
        if (
          source[index] === '*'
          && source[index + 1] === '/'
        ) {
          output += '  ';
          index += 2;
          break;
        }

        output +=
          source[index] === '\n'
            ? '\n'
            : ' ';

        index += 1;
      }

      continue;
    }

    if (
      char === "'"
      || char === '"'
      || char === '`'
    ) {
      const quote = char;

      output += ' ';
      index += 1;

      while (
        index < source.length
      ) {
        const current =
          source[index];

        if (
          current === '\\'
        ) {
          output += '  ';
          index += 2;
          continue;
        }

        if (
          current === quote
        ) {
          output += ' ';
          index += 1;
          break;
        }

        output +=
          current === '\n'
            ? '\n'
            : ' ';

        index += 1;
      }

      continue;
    }

    output += char;
    index += 1;
  }

  return output;
}
