import {
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import {
  GoogleIdTokenVerifier,
  InvalidGoogleIdTokenError,
  type GoogleJwtVerifier,
} from '../src/auth/google-id-token-verifier.js';

const config = {
  clientId:
    'codegym-test.apps.googleusercontent.com',
};

describe(
  'GoogleIdTokenVerifier',
  () => {
    it('returns only the verified Google identity fields', async () => {
      const verifyJwt =
        vi.fn<GoogleJwtVerifier>()
          .mockResolvedValue({
            iss:
              'https://accounts.google.com',
            aud:
              config.clientId,
            sub:
              'google-user-123',
            email:
              'person@example.test',
            email_verified:
              true,
            name:
              'Ada Lovelace',
            exp:
              1_900_000_000,
            iat:
              1_800_000_000,
          });

      const verifier =
        new GoogleIdTokenVerifier(
          config,
          verifyJwt,
        );

      const identity =
        await verifier.verify(
          'signed-google-id-token',
        );

      expect(
        verifyJwt,
      ).toHaveBeenCalledOnce();

      expect(
        verifyJwt,
      ).toHaveBeenCalledWith(
        'signed-google-id-token',
        config.clientId,
      );

      expect(identity).toEqual({
        providerUserId:
          'google-user-123',
        email:
          'person@example.test',
        displayName:
          'Ada Lovelace',
      });

      expect(
        Object.isFrozen(identity),
      ).toBe(true);
    });

    it('allows a verified identity without a display name', async () => {
      const verifyJwt:
        GoogleJwtVerifier =
        () => Promise.resolve({
          sub:
            'google-user-123',
          email:
            'person@example.test',
          email_verified:
            true,
        });

      const verifier =
        new GoogleIdTokenVerifier(
          config,
          verifyJwt,
        );

      await expect(
        verifier.verify(
          'signed-google-id-token',
        ),
      ).resolves.toEqual({
        providerUserId:
          'google-user-123',
        email:
          'person@example.test',
        displayName:
          null,
      });
    });

    it.each([
      {
        label: 'missing sub',
        payload: {
          email:
            'person@example.test',
          email_verified:
            true,
        },
      },
      {
        label: 'empty sub',
        payload: {
          sub: '   ',
          email:
            'person@example.test',
          email_verified:
            true,
        },
      },
      {
        label: 'missing email',
        payload: {
          sub:
            'google-user-123',
          email_verified:
            true,
        },
      },
      {
        label: 'empty email',
        payload: {
          sub:
            'google-user-123',
          email: '   ',
          email_verified:
            true,
        },
      },
      {
        label:
          'unverified email',
        payload: {
          sub:
            'google-user-123',
          email:
            'person@example.test',
          email_verified:
            false,
        },
      },
      {
        label:
          'missing email verification',
        payload: {
          sub:
            'google-user-123',
          email:
            'person@example.test',
        },
      },
    ])(
      'rejects $label',
      async ({ payload }) => {
        const verifyJwt:
          GoogleJwtVerifier =
          () => Promise.resolve(
            payload,
          );

        const verifier =
          new GoogleIdTokenVerifier(
            config,
            verifyJwt,
          );

        await expect(
          verifier.verify(
            'signed-google-id-token',
          ),
        ).rejects.toBeInstanceOf(
          InvalidGoogleIdTokenError,
        );
      },
    );

    it('maps JWT signature, issuer, audience and expiration failures to the same safe error', async () => {
      const verifyJwt:
        GoogleJwtVerifier =
        () => Promise.reject(
          new Error(
            'JOSE verification failed',
          ),
        );

      const verifier =
        new GoogleIdTokenVerifier(
          config,
          verifyJwt,
        );

      await expect(
        verifier.verify(
          'invalid-google-token',
        ),
      ).rejects.toBeInstanceOf(
        InvalidGoogleIdTokenError,
      );
    });

    it('rejects an empty token before attempting JWT verification', async () => {
      const verifyJwt =
        vi.fn<GoogleJwtVerifier>();

      const verifier =
        new GoogleIdTokenVerifier(
          config,
          verifyJwt,
        );

      await expect(
        verifier.verify('   '),
      ).rejects.toBeInstanceOf(
        InvalidGoogleIdTokenError,
      );

      expect(
        verifyJwt,
      ).not.toHaveBeenCalled();
    });
  },
);
