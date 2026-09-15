import {
  AuthenticatedUserNotFoundError,
} from './current-user-service.js';
import {
  toPublicUser,
  type PublicUser,
} from './public-user.js';
import type {
  UserRepository,
} from './user-repository.js';

export class ProfileService {
  public constructor(
    private readonly userRepository: Pick<
      UserRepository,
      'updateDisplayName'
    >,
  ) {}

  public async updateDisplayName(
    userId: string,
    displayName: string,
  ): Promise<PublicUser> {
    const user =
      await this.userRepository.updateDisplayName(
        userId,
        displayName,
      );

    if (user === null) {
      throw new AuthenticatedUserNotFoundError();
    }

    return toPublicUser(user);
  }
}
