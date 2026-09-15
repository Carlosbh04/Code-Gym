import type {
  RequestHandler,
  Response,
} from 'express';

import type {
  UserRole,
} from '../auth/public-user.js';
import type {
  UserRepository,
} from '../auth/user-repository.js';

export interface RequireRoleDependencies {
  readonly userRepository: Pick<
    UserRepository,
    'findUserById'
  >;
}

export type RequireRole = (
  ...allowedRoles: readonly UserRole[]
) => RequestHandler;

export function createRequireRole({
  userRepository,
}: RequireRoleDependencies): RequireRole {
  return (
    ...allowedRoles
  ) => {
    const allowedRoleSet =
      new Set<UserRole>(
        allowedRoles,
      );

    return async (
      request,
      response,
      next,
    ) => {
      const auth =
        request.auth;

      if (auth === undefined) {
        respondUnauthorized(
          response,
        );

        return;
      }

      let user;

      try {
        user =
          await userRepository
            .findUserById(
              auth.userId,
            );
      } catch (error) {
        next(error);
        return;
      }

      if (user === null) {
        respondUnauthorized(
          response,
        );

        return;
      }

      if (
        !allowedRoleSet.has(
          user.role,
        )
      ) {
        respondForbidden(
          response,
        );

        return;
      }

      next();
    };
  };
}

function respondUnauthorized(
  response: Response,
): void {
  response.status(401).json({
    error: {
      code:
        'UNAUTHORIZED',

      message:
        'Authentication required',
    },
  });
}

function respondForbidden(
  response: Response,
): void {
  response.status(403).json({
    error: {
      code:
        'FORBIDDEN',

      message:
        'Insufficient permissions',
    },
  });
}