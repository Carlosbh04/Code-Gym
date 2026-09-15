import {
  createHmac,
  randomBytes,
  randomInt,
  timingSafeEqual,
} from 'node:crypto';

export interface PasswordResetCryptoDependencies {
  readonly randomInteger?: (maximum: number) => number;
  readonly randomBytes?: (size: number) => Buffer;
}

export class PasswordResetCrypto {
  private readonly secret: Buffer;
  private readonly randomInteger: (maximum: number) => number;
  private readonly randomByteGenerator: (size: number) => Buffer;

  public constructor(
    hmacSecret: string,
    dependencies: PasswordResetCryptoDependencies = {},
  ) {
    this.secret = Buffer.from(hmacSecret, 'base64url');
    this.randomInteger = dependencies.randomInteger ?? ((maximum) => randomInt(maximum));
    this.randomByteGenerator = dependencies.randomBytes ?? randomBytes;
  }

  public generateCode(): string {
    return this.randomInteger(1_000_000)
      .toString()
      .padStart(6, '0');
  }

  public generateChallengeNonce(): Uint8Array {
    return new Uint8Array(this.randomByteGenerator(16));
  }

  public generateResetToken(): string {
    return this.randomByteGenerator(32).toString('base64url');
  }

  public digestCode(
    challengeNonce: Uint8Array,
    code: string,
  ): Uint8Array {
    return this.digest(
      'password-reset-code-v1',
      Buffer.from(challengeNonce).toString('base64url'),
      code,
    );
  }

  public digestResetToken(resetToken: string): Uint8Array {
    return this.digest(
      'password-reset-token-v1',
      resetToken,
    );
  }

  public digestsEqual(
    left: Uint8Array,
    right: Uint8Array,
  ): boolean {
    const leftBuffer = Buffer.from(left);
    const rightBuffer = Buffer.from(right);

    return leftBuffer.byteLength === rightBuffer.byteLength
      && timingSafeEqual(leftBuffer, rightBuffer);
  }

  private digest(...parts: readonly string[]): Uint8Array {
    const hmac = createHmac('sha256', this.secret);

    for (const part of parts) {
      const encoded = Buffer.from(part, 'utf8');
      const length = Buffer.allocUnsafe(4);
      length.writeUInt32BE(encoded.byteLength);
      hmac.update(length);
      hmac.update(encoded);
    }

    return new Uint8Array(hmac.digest());
  }
}
