import {
  type ContentSessionId,
} from './content-id.js';

import {
  verifierManifestSchema,
  type VerifierManifest,
  type VerifierSession,
} from './verifier-manifest.js';

export interface VerifierManifestRepository {
  getSessionById(
    sessionId:
      ContentSessionId,
  ): VerifierSession | null;
}

export class StaticVerifierManifestRepository
implements VerifierManifestRepository {
  private readonly sessions:
    ReadonlyMap<
      ContentSessionId,
      VerifierSession
    >;

  public constructor(
    manifest:
      unknown,
  ) {
    const parsed =
      verifierManifestSchema
        .parse(
          manifest,
        );

    assertManifestIntegrity(
      parsed,
    );

    this.sessions =
      new Map(
        parsed.sessions.map(
          (session) => [
            session.id,
            freezeSession(
              session,
            ),
          ],
        ),
      );
  }

  public getSessionById(
    sessionId:
      ContentSessionId,
  ): VerifierSession | null {
    return (
      this.sessions.get(
        sessionId,
      )
      ?? null
    );
  }
}

function assertManifestIntegrity(
  manifest:
    VerifierManifest,
): void {
  const sessionIds =
    new Set<string>();

  for (
    const session
    of manifest.sessions
  ) {
    if (
      sessionIds.has(
        session.id,
      )
    ) {
      throw new InvalidVerifierManifestError(
        `Duplicate session identifier: ${session.id}`,
      );
    }

    sessionIds.add(
      session.id,
    );

    if (
      session.totalExercises
      !== session.steps.length
    ) {
      throw new InvalidVerifierManifestError(
        `Session ${session.id} has an inconsistent exercise count`,
      );
    }

    const exerciseIds =
      new Set<string>();

    for (
      const step
      of session.steps
    ) {
      if (
        exerciseIds.has(
          step.id,
        )
      ) {
        throw new InvalidVerifierManifestError(
          `Session ${session.id} has duplicate exercise identifier ${step.id}`,
        );
      }

      exerciseIds.add(
        step.id,
      );

      if (
        (
          step.type ===
            'code-reading'
          || step.type ===
            'predict-output'
        )
        && new Set(
          step.correctOptionIds,
        ).size
          !==
          step.correctOptionIds.length
      ) {
        throw new InvalidVerifierManifestError(
          `Exercise ${session.id}/${step.id} has duplicate correct option identifiers`,
        );
      }
    }
  }
}

function freezeSession(
  session:
    VerifierSession,
): VerifierSession {
  for (
    const step
    of session.steps
  ) {
    Object.freeze(
      step.hints,
    );

    if (
      step.type ===
        'code-reading'
      || step.type ===
        'predict-output'
    ) {
      Object.freeze(
        step.correctOptionIds,
      );
    }

    if (
      step.type ===
        'find-error'
    ) {
      Object.freeze(
        step.errorLines,
      );
    }

    if (
      step.type ===
        'fix-code'
    ) {
      for (
        const testCase
        of step.testCases
      ) {
        Object.freeze(
          testCase,
        );
      }

      Object.freeze(
        step.testCases,
      );
    }

    Object.freeze(
      step,
    );
  }

  Object.freeze(
    session.steps,
  );

  return Object.freeze(
    session,
  );
}

export class InvalidVerifierManifestError
extends Error {
  public constructor(
    message =
      'Invalid verifier manifest',
  ) {
    super(
      message,
    );

    this.name =
      'InvalidVerifierManifestError';
  }
}
