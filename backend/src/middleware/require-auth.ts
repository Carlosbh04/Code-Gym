import type {
  Request,
  RequestHandler,
  Response,
} from 'express';

import {
  InvalidAccessTokenError,
  type AccessTokenService,
} from '../auth/access-token-service.js';
import type { AuthSessionRepository } from '../auth/auth-session-repository.js';
import { isSessionIdleExpired } from '../auth/session-idle-policy.js';

export type RequireAuthClock = () => Date;

export interface RequireAuthDependencies {
  readonly accessTokenService: Pick<AccessTokenService, 'verify'>;
  readonly authSessionRepository: Pick<AuthSessionRepository, 'findSessionById'>;
  readonly idleSessionTimeoutSeconds: number;
  readonly clock?: RequireAuthClock;
}

export function createRequireAuth({
  accessTokenService,
  authSessionRepository,
  idleSessionTimeoutSeconds,
  clock = () => new Date(),
}: RequireAuthDependencies): RequestHandler {
  return async (
    request,
    response,
    next,
  ) => {
    const accessToken = readBearerToken(
      request,
    );

    if (accessToken === undefined) {
      respondUnauthorized(response);
      return;
    }

    let claims;

    try {
      claims = await accessTokenService.verify(
        accessToken,
      );
    } catch (error) {
      if (error instanceof InvalidAccessTokenError) {
        respondUnauthorized(response);
        return;
      }

      next(error);
      return;
    }

    let session;

    try {
      session = await authSessionRepository.findSessionById(
        claims.sid,
      );
    } catch (error) {
      next(error);
      return;
    }

    const now = clock();

    if (
      session === null
      || session.userId !== claims.sub
      || session.revokedAt !== null
      || session.expiresAt.getTime() <= now.getTime()
      || isSessionIdleExpired(
        session,
        now,
        idleSessionTimeoutSeconds,
      )
    ) {
      respondUnauthorized(response);
      return;
    }

    request.auth = Object.freeze({
      userId: claims.sub,
      sessionId: claims.sid,
    });

    next();
  };
}

function readBearerToken(
  request: Request,
): string | undefined {
  let authorizationHeaderCount = 0;

  for (
    let index = 0;
    index < request.rawHeaders.length;
    index += 2
  ) {
    if (
      request.rawHeaders[index]?.toLowerCase()
      === 'authorization'
    ) {
      authorizationHeaderCount += 1;
    }
  }

  if (authorizationHeaderCount !== 1) {
    return undefined;
  }

  const match = /^Bearer (\S+)$/.exec(
    request.headers.authorization ?? '',
  );

  return match?.[1];
}

function respondUnauthorized(
  response: Response,
): void {
  response.status(401).json({
    error: {
      code: 'UNAUTHORIZED',
      message: 'Authentication required',
    },
  });
}
