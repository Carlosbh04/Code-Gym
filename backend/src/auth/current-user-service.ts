import {
  toPublicUser,
  type PublicUser,
} from './public-user.js';
import type {
  UserRepository,
} from './user-repository.js';

export class AuthenticatedUserNotFoundError
  extends Error {
  public constructor() {
    super('Authenticated user not found');
    this.name =
      'AuthenticatedUserNotFoundError';
  }
}

export class CurrentUserService {
  public constructor(
    private readonly userRepository: Pick<
      UserRepository,
      'findUserById'
    >,
  ) {}

  public async getCurrentUser(
    userId: string,
  ): Promise<PublicUser> {
    const user =
      await this.userRepository.findUserById(
        userId,
      );

    if (user === null) {
      throw new AuthenticatedUserNotFoundError();
    }

    return toPublicUser(user);
  }
}