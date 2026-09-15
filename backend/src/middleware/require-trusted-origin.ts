import type {
  RequestHandler,
} from 'express';

export function createRequireTrustedOrigin(
  allowedOrigins:
    readonly string[],
): RequestHandler {
  const trustedOrigins =
    new Set(
      allowedOrigins,
    );

  return (
    request,
    response,
    next,
  ) => {
    const origin =
      request.get(
        'Origin',
      );

    /*
     * Requests without Origin remain available
     * to non-browser clients.
     *
     * Browser requests that send Origin must
     * match the configured allowlist exactly.
     */
    if (
      origin === undefined
    ) {
      next();

      return;
    }

    if (
      trustedOrigins.has(
        origin,
      )
    ) {
      next();

      return;
    }

    response.status(403).json({
      error: {
        code:
          'UNTRUSTED_ORIGIN',

        message:
          'Request origin is not allowed',
      },
    });
  };
}