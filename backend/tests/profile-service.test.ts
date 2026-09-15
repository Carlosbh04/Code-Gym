import { describe, expect, it, vi } from 'vitest';

import { AuthenticatedUserNotFoundError } from '../src/auth/current-user-service.js';
import { ProfileService } from '../src/auth/profile-service.js';
import type { UserRepository } from '../src/auth/user-repository.js';

const persistedUser = {
  id: 'user-1',
  email: 'person@example.test',
  displayName: 'Carlos Hernández',
  role: 'USER' as const,
  createdAt: new Date('2026-09-10T10:00:00.000Z'),
  updatedAt: new Date('2026-09-13T10:00:00.000Z'),
};

describe('profile service', () => {
  it('updates the authenticated user displayName and returns the public DTO', async () => {
    const updateDisplayName = vi
      .fn<UserRepository['updateDisplayName']>()
      .mockResolvedValue(persistedUser);
    const service = new ProfileService({
      updateDisplayName,
    });

    await expect(
      service.updateDisplayName('user-1', 'Carlos Hernández'),
    ).resolves.toEqual({
      id: 'user-1',
      email: 'person@example.test',
      displayName: 'Carlos Hernández',
      role: 'USER',
      createdAt: '2026-09-10T10:00:00.000Z',
      updatedAt: '2026-09-13T10:00:00.000Z',
    });

    expect(updateDisplayName).toHaveBeenCalledWith(
      'user-1',
      'Carlos Hernández',
    );
  });

  it('keeps the existing unauthorized semantics when the account no longer exists', async () => {
    const service = new ProfileService({
      updateDisplayName: vi
        .fn<UserRepository['updateDisplayName']>()
        .mockResolvedValue(null),
    });

    await expect(
      service.updateDisplayName('missing-user', 'Ada'),
    ).rejects.toBeInstanceOf(AuthenticatedUserNotFoundError);
  });
});
