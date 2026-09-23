import type { ErrorRequestHandler } from 'express';
import type { Logger } from 'pino';

interface HttpBodyError extends Error {
  status?: unknown;
  type?: unknown;
}

function isHttpBodyError(
  error: unknown,
  expectedType: 'entity.parse.failed' | 'entity.too.large',
  expectedStatus: 400 | 413,
): error is HttpBodyError {
  if (!(error instanceof Error)) {
    return false;
  }

  const candidate = error as HttpBodyError;
  return candidate.type === expectedType && candidate.status === expectedStatus;
}

function safeInternalErrorMetadata(
  error: unknown,
): Readonly<{
  errorName: string;
  errorCode?: string;
}> {
  /*
   * SAFE_INTERNAL_ERROR_METADATA
   *
   * Nunca serializamos el Error crudo porque message/stack pueden
   * contener SQL, URLs de conexión, hashes, tokens o datos privados.
   *
   * Solo conservamos metadatos estructurados que no provienen del
   * texto del error. Esto mantiene observabilidad suficiente para
   * distinguir errores técnicos reales (por ejemplo códigos Prisma)
   * sin registrar secretos.
   */
  const errorName =
    error instanceof Error
      ? error.name
      : 'UnknownError';

  if (
    typeof error === 'object'
    && error !== null
    && 'code' in error
  ) {
    const candidate =
      (error as {
        readonly code?: unknown;
      }).code;

    if (
      typeof candidate === 'string'
      && /^[A-Z][A-Z0-9_]{0,31}$/.test(
        candidate,
      )
    ) {
      return Object.freeze({
        errorName,
        errorCode:
          candidate,
      });
    }
  }

  return Object.freeze({
    errorName,
  });
}

export function createErrorHandler(logger: Logger): ErrorRequestHandler {
  return (error: unknown, _request, response, next) => {
    if (response.headersSent) {
      next(error);
      return;
    }

    if (isHttpBodyError(error, 'entity.parse.failed', 400)) {
      response.status(400).json({
        error: {
          code: 'INVALID_JSON',
          message: 'Request body contains invalid JSON',
        },
      });
      return;
    }

    if (isHttpBodyError(error, 'entity.too.large', 413)) {
      response.status(413).json({
        error: {
          code: 'PAYLOAD_TOO_LARGE',
          message: 'Request body is too large',
        },
      });
      return;
    }

    logger.error(
      {
        event:
          'unhandledRequestError',

        ...safeInternalErrorMetadata(
          error,
        ),
      },
      'Unhandled request error',
    );
    response.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
      },
    });
  };
}
