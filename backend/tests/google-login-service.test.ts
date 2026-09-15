import {
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import {
  AuthProvider,
  ProviderIdentityAlreadyLinkedError,
  type AuthIdentityRepository,
} from '../src/auth/auth-identity-repository.js';

import type {
  AuthenticatedSessionIssuer,
  AuthenticatedSessionResult,
} from '../src/auth/authenticated-session.js';

import type {
  GoogleAccountRepository,
} from '../src/auth/google-account-repository.js';

import {
  GoogleEmailAlreadyRegisteredError,
  GoogleLoginService,
  InvalidGoogleAccountStateError,
} from '../src/auth/google-login-service.js';

import type {
  GoogleIdTokenVerifier,
  VerifiedGoogleIdentity,
} from '../src/auth/google-id-token-verifier.js';

import {
  EmailAlreadyExistsError,
  type UserRepository,
} from '../src/auth/user-repository.js';

const verifiedIdentity:
  VerifiedGoogleIdentity = {
    providerUserId:
      'google-sub-123',
    email:
      'Google.User@Example.TEST',
    displayName:
      'Google User',
  };

const localUser = {
  id:
    'user-1',
  email:
    'google.user@example.test',
  passwordHash:
    null,
  displayName:
    'Google User',
  role:
    'USER' as const,
  createdAt:
    new Date(
      '2026-09-15T08:00:00.000Z',
    ),
  updatedAt:
    new Date(
      '2026-09-15T08:00:00.000Z',
    ),
};

const publicLocalUser = {
  id:
    localUser.id,
  email:
    localUser.email,
  displayName:
    localUser.displayName,
  role:
    localUser.role,
  createdAt:
    localUser.createdAt,
  updatedAt:
    localUser.updatedAt,
};

const authIdentity = {
  id:
    'identity-1',
  userId:
    'user-1',
  provider:
    AuthProvider.GOOGLE,
  providerUserId:
    'google-sub-123',
  createdAt:
    new Date(
      '2026-09-15T08:00:00.000Z',
    ),
  updatedAt:
    new Date(
      '2026-09-15T08:00:00.000Z',
    ),
};

const loginResult:
  AuthenticatedSessionResult = {
    user: {
      id:
        'user-1',
      email:
        'google.user@example.test',
      displayName:
        'Google User',
      role:
        'USER',
      createdAt:
        '2026-09-15T08:00:00.000Z',
      updatedAt:
        '2026-09-15T08:00:00.000Z',
    },
    accessToken:
      'access-token',
    refreshToken:
      'refresh-token',
  };

function createVerifier(
  verify:
    GoogleIdTokenVerifier['verify'],
): Pick<
  GoogleIdTokenVerifier,
  'verify'
> {
  return {
    verify,
  };
}

function createIdentityRepository(
  findByProviderIdentity:
    AuthIdentityRepository[
      'findByProviderIdentity'
    ],
): AuthIdentityRepository {
  return {
    findByProviderIdentity,
    findByUserAndProvider:
      vi
        .fn<
          AuthIdentityRepository[
            'findByUserAndProvider'
          ]
        >()
        .mockResolvedValue(
          null,
        ),
    createIdentity:
      vi
        .fn<
          AuthIdentityRepository[
            'createIdentity'
          ]
        >(),
  };
}

function createUserRepository(
  overrides: Partial<UserRepository>,
): UserRepository {
  return {
    createUser:
      vi
        .fn<
          UserRepository[
            'createUser'
          ]
        >(),
    findUserByEmail:
      vi
        .fn<
          UserRepository[
            'findUserByEmail'
          ]
        >()
        .mockResolvedValue(
          null,
        ),
    findUserById:
      vi
        .fn<
          UserRepository[
            'findUserById'
          ]
        >()
        .mockResolvedValue(
          null,
        ),
    updateDisplayName:
      vi
        .fn<
          UserRepository[
            'updateDisplayName'
          ]
        >()
        .mockResolvedValue(
          null,
        ),
    ...overrides,
  };
}

function createGoogleAccountRepository(
  createGoogleAccount:
    GoogleAccountRepository[
      'createGoogleAccount'
    ],
): GoogleAccountRepository {
  return {
    createGoogleAccount,
  };
}

function createSessionIssuer(
  issue:
    AuthenticatedSessionIssuer[
      'issue'
    ],
): AuthenticatedSessionIssuer {
  return {
    issue,
  } as AuthenticatedSessionIssuer;
}

describe(
  'GoogleLoginService',
  () => {
    it('logs in an already linked Google identity without checking the email owner', async () => {
      const findByProviderIdentity =
        vi
          .fn<
            AuthIdentityRepository[
              'findByProviderIdentity'
            ]
          >()
          .mockResolvedValue(
            authIdentity,
          );

      const findUserByEmail =
        vi
          .fn<
            UserRepository[
              'findUserByEmail'
            ]
          >();

      const findUserById =
        vi
          .fn<
            UserRepository[
              'findUserById'
            ]
          >()
          .mockResolvedValue(
            publicLocalUser,
          );

      const createGoogleAccount =
        vi
          .fn<
            GoogleAccountRepository[
              'createGoogleAccount'
            ]
          >();

      const issue =
        vi
          .fn<
            AuthenticatedSessionIssuer[
              'issue'
            ]
          >()
          .mockResolvedValue(
            loginResult,
          );

      const service =
        new GoogleLoginService(
          createVerifier(
            vi
              .fn()
              .mockResolvedValue(
                verifiedIdentity,
              ),
          ),
          createIdentityRepository(
            findByProviderIdentity,
          ),
          createUserRepository({
            findUserByEmail,
            findUserById,
          }),
          createGoogleAccountRepository(
            createGoogleAccount,
          ),
          createSessionIssuer(
            issue,
          ),
        );

      await expect(
        service.login(
          'google-id-token',
        ),
      ).resolves.toEqual(
        loginResult,
      );

      expect(
        findByProviderIdentity,
      ).toHaveBeenCalledWith(
        AuthProvider.GOOGLE,
        'google-sub-123',
      );

      expect(
        findUserById,
      ).toHaveBeenCalledWith(
        'user-1',
      );

      expect(
        findUserByEmail,
      ).not.toHaveBeenCalled();

      expect(
        createGoogleAccount,
      ).not.toHaveBeenCalled();

      expect(
        issue,
      ).toHaveBeenCalledWith(
        publicLocalUser,
      );
    });

    it('rejects a new Google identity when the verified email already belongs to a local account', async () => {
      const findUserByEmail =
        vi
          .fn<
            UserRepository[
              'findUserByEmail'
            ]
          >()
          .mockResolvedValue({
            ...localUser,
            passwordHash:
              '$argon2id$existing',
          });

      const createGoogleAccount =
        vi
          .fn<
            GoogleAccountRepository[
              'createGoogleAccount'
            ]
          >();

      const issue =
        vi
          .fn<
            AuthenticatedSessionIssuer[
              'issue'
            ]
          >();

      const service =
        new GoogleLoginService(
          createVerifier(
            vi
              .fn()
              .mockResolvedValue(
                verifiedIdentity,
              ),
          ),
          createIdentityRepository(
            vi
              .fn()
              .mockResolvedValue(
                null,
              ),
          ),
          createUserRepository({
            findUserByEmail,
          }),
          createGoogleAccountRepository(
            createGoogleAccount,
          ),
          createSessionIssuer(
            issue,
          ),
        );

      await expect(
        service.login(
          'google-id-token',
        ),
      ).rejects.toEqual(
        new GoogleEmailAlreadyRegisteredError(),
      );

      expect(
        findUserByEmail,
      ).toHaveBeenCalledWith(
        'google.user@example.test',
      );

      expect(
        createGoogleAccount,
      ).not.toHaveBeenCalled();

      expect(
        issue,
      ).not.toHaveBeenCalled();
    });

    it('creates a new Google-only account and issues a normal CodeGym session', async () => {
      const createGoogleAccount =
        vi
          .fn<
            GoogleAccountRepository[
              'createGoogleAccount'
            ]
          >()
          .mockResolvedValue(
            publicLocalUser,
          );

      const issue =
        vi
          .fn<
            AuthenticatedSessionIssuer[
              'issue'
            ]
          >()
          .mockResolvedValue(
            loginResult,
          );

      const service =
        new GoogleLoginService(
          createVerifier(
            vi
              .fn()
              .mockResolvedValue(
                verifiedIdentity,
              ),
          ),
          createIdentityRepository(
            vi
              .fn()
              .mockResolvedValue(
                null,
              ),
          ),
          createUserRepository({}),
          createGoogleAccountRepository(
            createGoogleAccount,
          ),
          createSessionIssuer(
            issue,
          ),
        );

      await expect(
        service.login(
          'google-id-token',
        ),
      ).resolves.toEqual(
        loginResult,
      );

      expect(
        createGoogleAccount,
      ).toHaveBeenCalledWith({
        email:
          'google.user@example.test',
        displayName:
          'Google User',
        providerUserId:
          'google-sub-123',
      });

      expect(
        issue,
      ).toHaveBeenCalledWith(
        publicLocalUser,
      );
    });

    it('recovers a concurrent first-login race when the Google identity was created by the other request', async () => {
      const findByProviderIdentity =
        vi
          .fn<
            AuthIdentityRepository[
              'findByProviderIdentity'
            ]
          >()
          .mockResolvedValueOnce(
            null,
          )
          .mockResolvedValueOnce(
            authIdentity,
          );

      const findUserById =
        vi
          .fn<
            UserRepository[
              'findUserById'
            ]
          >()
          .mockResolvedValue(
            publicLocalUser,
          );

      const issue =
        vi
          .fn<
            AuthenticatedSessionIssuer[
              'issue'
            ]
          >()
          .mockResolvedValue(
            loginResult,
          );

      const service =
        new GoogleLoginService(
          createVerifier(
            vi
              .fn()
              .mockResolvedValue(
                verifiedIdentity,
              ),
          ),
          createIdentityRepository(
            findByProviderIdentity,
          ),
          createUserRepository({
            findUserById,
          }),
          createGoogleAccountRepository(
            vi
              .fn()
              .mockRejectedValue(
                new ProviderIdentityAlreadyLinkedError(),
              ),
          ),
          createSessionIssuer(
            issue,
          ),
        );

      await expect(
        service.login(
          'google-id-token',
        ),
      ).resolves.toEqual(
        loginResult,
      );

      expect(
        findByProviderIdentity,
      ).toHaveBeenCalledTimes(
        2,
      );

      expect(
        issue,
      ).toHaveBeenCalledWith(
        publicLocalUser,
      );
    });

    it('does not misclassify an email race as an account conflict when the same Google identity now exists', async () => {
      const findByProviderIdentity =
        vi
          .fn<
            AuthIdentityRepository[
              'findByProviderIdentity'
            ]
          >()
          .mockResolvedValueOnce(
            null,
          )
          .mockResolvedValueOnce(
            authIdentity,
          );

      const issue =
        vi
          .fn<
            AuthenticatedSessionIssuer[
              'issue'
            ]
          >()
          .mockResolvedValue(
            loginResult,
          );

      const service =
        new GoogleLoginService(
          createVerifier(
            vi
              .fn()
              .mockResolvedValue(
                verifiedIdentity,
              ),
          ),
          createIdentityRepository(
            findByProviderIdentity,
          ),
          createUserRepository({
            findUserById:
              vi
                .fn()
                .mockResolvedValue(
                  publicLocalUser,
                ),
          }),
          createGoogleAccountRepository(
            vi
              .fn()
              .mockRejectedValue(
                new EmailAlreadyExistsError(),
              ),
          ),
          createSessionIssuer(
            issue,
          ),
        );

      await expect(
        service.login(
          'google-id-token',
        ),
      ).resolves.toEqual(
        loginResult,
      );
    });

    it('rejects a true email collision discovered during concurrent account creation', async () => {
      const findByProviderIdentity =
        vi
          .fn<
            AuthIdentityRepository[
              'findByProviderIdentity'
            ]
          >()
          .mockResolvedValue(
            null,
          );

      const service =
        new GoogleLoginService(
          createVerifier(
            vi
              .fn()
              .mockResolvedValue(
                verifiedIdentity,
              ),
          ),
          createIdentityRepository(
            findByProviderIdentity,
          ),
          createUserRepository({}),
          createGoogleAccountRepository(
            vi
              .fn()
              .mockRejectedValue(
                new EmailAlreadyExistsError(),
              ),
          ),
          createSessionIssuer(
            vi.fn(),
          ),
        );

      await expect(
        service.login(
          'google-id-token',
        ),
      ).rejects.toEqual(
        new GoogleEmailAlreadyRegisteredError(),
      );

      expect(
        findByProviderIdentity,
      ).toHaveBeenCalledTimes(
        2,
      );
    });

    it('fails closed when a persisted Google identity points to a missing local user', async () => {
      const service =
        new GoogleLoginService(
          createVerifier(
            vi
              .fn()
              .mockResolvedValue(
                verifiedIdentity,
              ),
          ),
          createIdentityRepository(
            vi
              .fn()
              .mockResolvedValue(
                authIdentity,
              ),
          ),
          createUserRepository({
            findUserById:
              vi
                .fn()
                .mockResolvedValue(
                  null,
                ),
          }),
          createGoogleAccountRepository(
            vi.fn(),
          ),
          createSessionIssuer(
            vi.fn(),
          ),
        );

      await expect(
        service.login(
          'google-id-token',
        ),
      ).rejects.toEqual(
        new InvalidGoogleAccountStateError(),
      );
    });

    it('propagates an invalid Google token without touching persistence', async () => {
      const verifierError =
        new Error(
          'invalid token',
        );

      const findByProviderIdentity =
        vi.fn();

      const service =
        new GoogleLoginService(
          createVerifier(
            vi
              .fn()
              .mockRejectedValue(
                verifierError,
              ),
          ),
          createIdentityRepository(
            findByProviderIdentity,
          ),
          createUserRepository({}),
          createGoogleAccountRepository(
            vi.fn(),
          ),
          createSessionIssuer(
            vi.fn(),
          ),
        );

      await expect(
        service.login(
          'bad-token',
        ),
      ).rejects.toBe(
        verifierError,
      );

      expect(
        findByProviderIdentity,
      ).not.toHaveBeenCalled();
    });
  },
);
