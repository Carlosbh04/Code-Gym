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

    logger.error({ event: 'unhandledRequestError' }, 'Unhandled request error');
    response.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
      },
    });
  };
}
