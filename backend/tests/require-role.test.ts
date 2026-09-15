import type {
  NextFunction,
  Request,
  Response,
} from 'express';

import {
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import type {
  PublicUserSource,
} from '../src/auth/public-user.js';
import type {
  UserRepository,
} from '../src/auth/user-repository.js';
import {
  createRequireRole,
} from '../src/middleware/require-role.js';

const createdAt =
  new Date(
    '2026-09-11T10:00:00.000Z',
  );

const updatedAt =
  new Date(
    '2026-09-11T10:01:00.000Z',
  );

function user(
  role:
    PublicUserSource['role'],
): PublicUserSource {
  return {
    id:
      'user-1',

    email:
      'person@example.test',

    displayName:
      'Ada',

    role,

    createdAt,
    updatedAt,
  };
}

function repository(
  findUserById:
    UserRepository['findUserById'],
): Pick<
  UserRepository,
  'findUserById'
> {
  return {
    findUserById,
  };
}

function authenticatedRequest(): Request {
  return {
    auth: Object.freeze({
      userId:
        'user-1',

      sessionId:
        'session-1',
    }),
  } as Request;
}

function unauthenticatedRequest(): Request {
  return {} as Request;
}

function responseMock(): {
  response: Response;
  status: ReturnType<
    typeof vi.fn
  >;
  json: ReturnType<
    typeof vi.fn
  >;
} {
  const json =
    vi.fn();

  const status =
    vi.fn();

  const response = {
    status,
    json,
  } as unknown as Response;

  status.mockReturnValue(
    response,
  );

  json.mockReturnValue(
    response,
  );

  return {
    response,
    status,
    json,
  };
}

function nextMock(): {
  next: NextFunction;
  spy: ReturnType<
    typeof vi.fn
  >;
} {
  const spy =
    vi.fn();

  const next: NextFunction = (
    value?: unknown,
  ) => {
    spy(value);
  };

  return {
    next,
    spy,
  };
}

describe(
  'requireRole middleware',
  () => {
    it('allows an authenticated user whose current database role is allowed', async () => {
      const findUserById = vi
        .fn<
          UserRepository[
            'findUserById'
          ]
        >()
        .mockResolvedValue(
          user(
            'ADMIN',
          ),
        );

      const requireRole =
        createRequireRole({
          userRepository:
            repository(
              findUserById,
            ),
        });

      const middleware =
        requireRole(
          'ADMIN',
        );

      const {
        response,
        status,
        json,
      } =
        responseMock();

      const {
        next,
        spy: nextSpy,
      } =
        nextMock();

      await middleware(
        authenticatedRequest(),
        response,
        next,
      );

      expect(
        findUserById,
      ).toHaveBeenCalledOnce();

      expect(
        findUserById,
      ).toHaveBeenCalledWith(
        'user-1',
      );

      expect(
        nextSpy,
      ).toHaveBeenCalledOnce();

      expect(
        status,
      ).not.toHaveBeenCalled();

      expect(
        json,
      ).not.toHaveBeenCalled();
    });

    it('returns 403 when the authenticated user does not have an allowed role', async () => {
      const findUserById = vi
        .fn<
          UserRepository[
            'findUserById'
          ]
        >()
        .mockResolvedValue(
          user(
            'USER',
          ),
        );

      const requireRole =
        createRequireRole({
          userRepository:
            repository(
              findUserById,
            ),
        });

      const middleware =
        requireRole(
          'ADMIN',
        );

      const {
        response,
        status,
        json,
      } =
        responseMock();

      const {
        next,
        spy: nextSpy,
      } =
        nextMock();

      await middleware(
        authenticatedRequest(),
        response,
        next,
      );

      expect(
        findUserById,
      ).toHaveBeenCalledWith(
        'user-1',
      );

      expect(
        status,
      ).toHaveBeenCalledWith(
        403,
      );

      expect(
        json,
      ).toHaveBeenCalledWith({
        error: {
          code:
            'FORBIDDEN',

          message:
            'Insufficient permissions',
        },
      });

      expect(
        nextSpy,
      ).not.toHaveBeenCalled();
    });

    it('returns 401 without querying the repository when authentication context is missing', async () => {
      const findUserById =
        vi.fn<
          UserRepository[
            'findUserById'
          ]
        >();

      const requireRole =
        createRequireRole({
          userRepository:
            repository(
              findUserById,
            ),
        });

      const middleware =
        requireRole(
          'ADMIN',
        );

      const {
        response,
        status,
        json,
      } =
        responseMock();

      const {
        next,
        spy: nextSpy,
      } =
        nextMock();

      await middleware(
        unauthenticatedRequest(),
        response,
        next,
      );

      expect(
        status,
      ).toHaveBeenCalledWith(
        401,
      );

      expect(
        json,
      ).toHaveBeenCalledWith({
        error: {
          code:
            'UNAUTHORIZED',

          message:
            'Authentication required',
        },
      });

      expect(
        findUserById,
      ).not.toHaveBeenCalled();

      expect(
        nextSpy,
      ).not.toHaveBeenCalled();
    });

    it('returns 401 when the authenticated user no longer exists', async () => {
      const findUserById = vi
        .fn<
          UserRepository[
            'findUserById'
          ]
        >()
        .mockResolvedValue(
          null,
        );

      const requireRole =
        createRequireRole({
          userRepository:
            repository(
              findUserById,
            ),
        });

      const middleware =
        requireRole(
          'ADMIN',
        );

      const {
        response,
        status,
        json,
      } =
        responseMock();

      const {
        next,
        spy: nextSpy,
      } =
        nextMock();

      await middleware(
        authenticatedRequest(),
        response,
        next,
      );

      expect(
        status,
      ).toHaveBeenCalledWith(
        401,
      );

      expect(
        json,
      ).toHaveBeenCalledWith({
        error: {
          code:
            'UNAUTHORIZED',

          message:
            'Authentication required',
        },
      });

      expect(
        nextSpy,
      ).not.toHaveBeenCalled();
    });

    it('supports more than one allowed role', async () => {
      const findUserById = vi
        .fn<
          UserRepository[
            'findUserById'
          ]
        >()
        .mockResolvedValue(
          user(
            'USER',
          ),
        );

      const requireRole =
        createRequireRole({
          userRepository:
            repository(
              findUserById,
            ),
        });

      const middleware =
        requireRole(
          'USER',
          'ADMIN',
        );

      const {
        response,
        status,
      } =
        responseMock();

      const {
        next,
        spy: nextSpy,
      } =
        nextMock();

      await middleware(
        authenticatedRequest(),
        response,
        next,
      );

      expect(
        nextSpy,
      ).toHaveBeenCalledOnce();

      expect(
        status,
      ).not.toHaveBeenCalled();
    });

    it('uses the current database role instead of trusting client role data', async () => {
      const findUserById = vi
        .fn<
          UserRepository[
            'findUserById'
          ]
        >()
        .mockResolvedValue(
          user(
            'USER',
          ),
        );

      const request = {
        auth: Object.freeze({
          userId:
            'user-1',

          sessionId:
            'session-1',
        }),

        body: {
          role:
            'ADMIN',
        },

        headers: {
          'x-role':
            'ADMIN',
        },
      } as unknown as Request;

      const requireRole =
        createRequireRole({
          userRepository:
            repository(
              findUserById,
            ),
        });

      const middleware =
        requireRole(
          'ADMIN',
        );

      const {
        response,
        status,
      } =
        responseMock();

      const {
        next,
        spy: nextSpy,
      } =
        nextMock();

      await middleware(
        request,
        response,
        next,
      );

      expect(
        status,
      ).toHaveBeenCalledWith(
        403,
      );

      expect(
        nextSpy,
      ).not.toHaveBeenCalled();
    });

    it('passes repository failures to the Express error pipeline', async () => {
      const failure =
        new Error(
          'database unavailable',
        );

      const findUserById = vi
        .fn<
          UserRepository[
            'findUserById'
          ]
        >()
        .mockRejectedValue(
          failure,
        );

      const requireRole =
        createRequireRole({
          userRepository:
            repository(
              findUserById,
            ),
        });

      const middleware =
        requireRole(
          'ADMIN',
        );

      const {
        response,
        status,
        json,
      } =
        responseMock();

      const {
        next,
        spy: nextSpy,
      } =
        nextMock();

      await middleware(
        authenticatedRequest(),
        response,
        next,
      );

      expect(
        nextSpy,
      ).toHaveBeenCalledOnce();

      expect(
        nextSpy,
      ).toHaveBeenCalledWith(
        failure,
      );

      expect(
        status,
      ).not.toHaveBeenCalled();

      expect(
        json,
      ).not.toHaveBeenCalled();
    });
  },
);