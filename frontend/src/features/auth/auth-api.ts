import {
  apiRequest,
} from '@/lib/api/http-client';

export type UserRole =
  | 'USER'
  | 'ADMIN';

export interface AuthUser {
  readonly id: string;
  readonly email: string;
  readonly displayName: string | null;
  readonly role: UserRole;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface LoginInput {
  readonly email: string;
  readonly password: string;
  readonly remember: boolean;
}

export interface LoginResponse {
  readonly user: AuthUser;
  readonly accessToken: string;
}

export interface GoogleLoginInput {
  readonly idToken: string;
}

export type GoogleLoginResponse =
  LoginResponse;

export interface RegisterInput {
  readonly email: string;
  readonly password: string;
  readonly displayName?: string;
}

export interface RegisterResponse {
  readonly user: AuthUser;
}

export interface MeResponse {
  readonly user: AuthUser;
}

export interface UpdateProfileInput {
  readonly displayName: string;
}

export interface UpdateProfileResponse {
  readonly user: AuthUser;
}

export interface PasswordResetRequestInput {
  readonly email: string;
}

export interface PasswordResetRequestResponse {
  readonly message: string;
}

export interface PasswordResetVerifyInput {
  readonly email: string;
  readonly code: string;
}

export interface PasswordResetVerifyResponse {
  readonly resetToken: string;
}

export interface PasswordResetConfirmInput {
  readonly resetToken: string;
  readonly newPassword: string;
}

export interface ChangePasswordInput {
  readonly currentPassword: string;
  readonly newPassword: string;
}

export function login(
  input: LoginInput,
): Promise<LoginResponse> {
  return apiRequest<LoginResponse>(
    '/auth/login',
    {
      method: 'POST',
      body: input,
    },
  );
}

export function googleLogin(
  input: GoogleLoginInput,
): Promise<GoogleLoginResponse> {
  return apiRequest<GoogleLoginResponse>(
    '/auth/google',
    {
      method: 'POST',
      body: input,
    },
  );
}

export function register(
  input: RegisterInput,
): Promise<RegisterResponse> {
  return apiRequest<RegisterResponse>(
    '/auth/register',
    {
      method: 'POST',
      body: input,
    },
  );
}

export function getCurrentUser(
  accessToken: string,
): Promise<MeResponse> {
  return apiRequest<MeResponse>(
    '/auth/me',
    {
      method: 'GET',
      accessToken,
    },
  );
}

export function updateProfile(
  input: UpdateProfileInput,
  accessToken: string,
): Promise<UpdateProfileResponse> {
  return apiRequest<UpdateProfileResponse>(
    '/auth/me',
    {
      method: 'PATCH',
      body: input,
      accessToken,
    },
  );
}

export function refreshAccessToken(): Promise<{
  readonly accessToken: string;
}> {
  return apiRequest<{
    readonly accessToken: string;
  }>(
    '/auth/refresh',
    {
      method: 'POST',
    },
  );
}

export function logout(): Promise<void> {
  return apiRequest<void>(
    '/auth/logout',
    {
      method: 'POST',
    },
  );
}

export function recordSessionActivity(

  accessToken: string,

): Promise<void> {

  return apiRequest<void>(

    '/auth/activity',

    {

      method: 'POST',

      accessToken,

    },

  );

}

export function requestPasswordReset(
  input: PasswordResetRequestInput,
  signal?: AbortSignal,
): Promise<PasswordResetRequestResponse> {
  return apiRequest<PasswordResetRequestResponse>(
    '/auth/password-reset/request',
    {
      method: 'POST',
      body: input,
      signal,
    },
  );
}

export function verifyPasswordReset(
  input: PasswordResetVerifyInput,
  signal?: AbortSignal,
): Promise<PasswordResetVerifyResponse> {
  return apiRequest<PasswordResetVerifyResponse>(
    '/auth/password-reset/verify',
    {
      method: 'POST',
      body: input,
      signal,
    },
  );
}

export function confirmPasswordReset(
  input: PasswordResetConfirmInput,
  signal?: AbortSignal,
): Promise<void> {
  return apiRequest<void>(
    '/auth/password-reset/confirm',
    {
      method: 'POST',
      body: input,
      signal,
    },
  );
}

export function changePassword(
  input: ChangePasswordInput,
  accessToken: string,
  signal?: AbortSignal,
): Promise<void> {
  return apiRequest<void>(
    '/auth/change-password',
    {
      method: 'POST',
      body: input,
      accessToken,
      signal,
    },
  );
}
