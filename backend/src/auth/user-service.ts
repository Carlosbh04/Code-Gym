import { hashPassword } from './password-service.js';
import { toPublicUser, type PublicUser } from './public-user.js';
import { normalizeEmail, type RegisterRequest } from './register-schema.js';
import type { UserRepository } from './user-repository.js';

export type PasswordHasher = (password: string) => Promise<string>;

export interface RegistrationService {
  register(input: RegisterRequest): Promise<PublicUser>;
}

export class UserService implements RegistrationService {
  public constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordHasher: PasswordHasher = hashPassword,
  ) {}

  public async register(input: RegisterRequest): Promise<PublicUser> {
    const passwordHash = await this.passwordHasher(input.password);
    const user = await this.userRepository.createUser({
      email: normalizeEmail(input.email),
      passwordHash,
      displayName: input.displayName ?? null,
    });

    return toPublicUser(user);
  }
}
