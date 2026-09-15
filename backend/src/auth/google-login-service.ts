import {
  AuthProvider,
  type AuthIdentityRepository,
  ProviderIdentityAlreadyLinkedError,
} from './auth-identity-repository.js';

import type {
  AuthenticatedSessionIssuer,
  AuthenticatedSessionResult,
} from './authenticated-session.js';

import type {
  GoogleAccountRepository,
} from './google-account-repository.js';

import type {
  GoogleIdTokenVerifier,
} from './google-id-token-verifier.js';

import {
  normalizeEmail,
} from './register-schema.js';

import {
  EmailAlreadyExistsError,
  type UserRepository,
} from './user-repository.js';

export class GoogleEmailAlreadyRegisteredError
extends Error {
  public constructor() {
    super(
      'An account with this email already exists',
    );

    this.name =
      'GoogleEmailAlreadyRegisteredError';
  }
}

export class InvalidGoogleAccountStateError
extends Error {
  public constructor() {
    super(
      'Google account is in an invalid state',
    );

    this.name =
      'InvalidGoogleAccountStateError';
  }
}

export class GoogleLoginService {
  public constructor(
    private readonly googleIdTokenVerifier:
      Pick<GoogleIdTokenVerifier, 'verify'>,
    private readonly authIdentityRepository:
      AuthIdentityRepository,
    private readonly userRepository:
      UserRepository,
    private readonly googleAccountRepository:
      GoogleAccountRepository,
    private readonly sessionIssuer:
      AuthenticatedSessionIssuer,
  ) {}

  public async login(
    idToken: string,
  ): Promise<AuthenticatedSessionResult> {
    const identity =
      await this.googleIdTokenVerifier
        .verify(
          idToken,
        );

    const existingIdentity =
      await this.authIdentityRepository
        .findByProviderIdentity(
          AuthProvider.GOOGLE,
          identity.providerUserId,
        );

    if (
      existingIdentity !== null
    ) {
      return this.loginExistingIdentity(
        existingIdentity.userId,
      );
    }

    const email =
      normalizeEmail(
        identity.email,
      );

    const existingUser =
      await this.userRepository
        .findUserByEmail(
          email,
        );

    if (
      existingUser !== null
    ) {
      throw new GoogleEmailAlreadyRegisteredError();
    }

    try {
      const user =
        await this.googleAccountRepository
          .createGoogleAccount({
            email,
            displayName:
              identity.displayName,
            providerUserId:
              identity.providerUserId,
          });

      return await this.sessionIssuer.issue(
        user,
      );
    } catch (error) {
      if (
        error
          instanceof ProviderIdentityAlreadyLinkedError
        || error
          instanceof EmailAlreadyExistsError
      ) {
        const racedIdentity =
          await this.authIdentityRepository
            .findByProviderIdentity(
              AuthProvider.GOOGLE,
              identity.providerUserId,
            );

        if (
          racedIdentity !== null
        ) {
          return this.loginExistingIdentity(
            racedIdentity.userId,
          );
        }

        if (
          error
            instanceof EmailAlreadyExistsError
        ) {
          throw new GoogleEmailAlreadyRegisteredError();
        }
      }

      throw error;
    }
  }

  private async loginExistingIdentity(
    userId: string,
  ): Promise<AuthenticatedSessionResult> {
    const user =
      await this.userRepository
        .findUserById(
          userId,
        );

    if (
      user === null
    ) {
      throw new InvalidGoogleAccountStateError();
    }

    return this.sessionIssuer.issue(
      user,
    );
  }
}
