import type { AuthConfig } from '../config/env.js';

import type { AccessTokenService } from './access-token-service.js';

import {
  AuthenticatedSessionIssuer,
  type AuthenticatedSessionResult,
} from './authenticated-session.js';

import type {
  AuthSessionRepository,
} from './auth-session-repository.js';

import type { LoginRequest } from './login-schema.js';

import { verifyPassword } from './password-service.js';

import {
  normalizeEmail,
} from './register-schema.js';

import type {
  UserRepository,
} from './user-repository.js';

const dummyPasswordHash =
  '$argon2id$v=19$m=65536,t=3,p=1$AAECAwQFBgcICQoLDA0ODw$NsRa5GdjNf2ldnHRed7QaVeMEBqxLH7gCcsccPTCTA0';

export type LoginResult =
  AuthenticatedSessionResult;

export class InvalidCredentialsError extends Error {
  public constructor() {
    super('Invalid email or password');

    this.name =
      'InvalidCredentialsError';
  }
}

export type PasswordVerifier = (
  passwordHash: string,
  password: string,
) => Promise<boolean>;

export type AuthClock = () => Date;

export class LoginService {
  public constructor(
    private readonly userRepository:
      UserRepository,
    private readonly authSessionRepository:
      AuthSessionRepository,
    private readonly accessTokenService:
      AccessTokenService,
    private readonly authConfig:
      Pick<AuthConfig, 'refreshTokenTtlSeconds'>,
    private readonly passwordVerifier:
      PasswordVerifier =
        verifyPassword,
    private readonly clock:
      AuthClock =
        () => new Date(),
  ) {}

  public async login(
    input: LoginRequest,
  ): Promise<LoginResult> {
    const email =
      normalizeEmail(
        input.email,
      );

    const user =
      await this.userRepository
        .findUserByEmail(
          email,
        );

    const passwordHash =
      user?.passwordHash
      ?? dummyPasswordHash;

    const passwordMatches =
      await this.passwordVerifier(
        passwordHash,
        input.password,
      );

    if (
      user === null
      || user.passwordHash === null
      || !passwordMatches
    ) {
      throw new InvalidCredentialsError();
    }

    const sessionIssuer =
      new AuthenticatedSessionIssuer(
        this.authSessionRepository,
        this.accessTokenService,
        this.authConfig,
        this.clock,
      );

    return sessionIssuer.issue(
      user,
      input.remember,
    );
  }
}
