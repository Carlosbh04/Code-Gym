export type UserRole =
  | 'USER'
  | 'ADMIN';

export interface PublicUserSource {
  readonly id: string;
  readonly email: string;
  readonly displayName: string | null;
  readonly role: UserRole;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface PublicUser {
  readonly id: string;
  readonly email: string;
  readonly displayName: string | null;
  readonly role: UserRole;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/**
 * Explicit allowlist:
 * credential and session fields cannot reach the DTO.
 */
export function toPublicUser(
  user: PublicUserSource,
): PublicUser {
  return Object.freeze({
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    createdAt:
      user.createdAt.toISOString(),
    updatedAt:
      user.updatedAt.toISOString(),
  });
}