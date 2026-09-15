import { describe, expect, it } from 'vitest';

import {
  passwordResetEmailSubject,
  renderPasswordResetEmail,
} from '../src/auth/password-reset-email-template.js';

function render(displayName: string | null = 'Carlos', code = '481927') {
  return renderPasswordResetEmail({
    displayName,
    code,
    expiresInMinutes: 5,
  });
}

describe('password reset email template', () => {
  it('renders the CodeGym password-reset content as compatible HTML', () => {
    const email = render();

    expect(email.subject).toBe(passwordResetEmailSubject);
    expect(email.html).toContain('Code<span style="color:#8b7cff;">Gym</span>');
    expect(email.html).toContain('Restablece tu contraseña');
    expect(email.html).toContain('aria-label="Código de seguridad 481927"');
    expect(email.html).toContain('Este código caduca en 5 minutos.');
    expect(email.html).toContain('Hola, Carlos:');
    expect(email.html).toContain('role="presentation"');
    expect(email.html).not.toMatch(/<script\b/i);
  });

  it('preserves a six-digit code with leading zeroes in HTML and plain text', () => {
    const email = render(null, '004821');

    expect(email.html).toContain('Código de seguridad 004821');
    expect(email.text).toContain('\n004821\n');
  });

  it('uses the greeting fallback without a display name', () => {
    const email = render(null);

    expect(email.html).toContain('>Hola:</p>');
    expect(email.text).toContain('\nHola:\n');
  });

  it('escapes and normalizes a user-controlled display name', () => {
    const email = render('<script>alert("x")</script>\r\nInjected');

    expect(email.html).toContain('Hola, &lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; Injected:');
    expect(email.html).not.toContain('<script>');
    expect(email.text).toContain('Hola, <script>alert("x")</script> Injected:');
    expect(email.text).not.toContain('\r');
  });

  it('generates a complete plain-text fallback', () => {
    const email = render();

    expect(email.text).toContain('CodeGym');
    expect(email.text).toContain('Restablece tu contraseña');
    expect(email.text).toContain('481927');
    expect(email.text).toContain('Este código caduca en 5 minutos.');
    expect(email.text).toContain('No compartas este código con nadie.');
  });

  it('does not include unrelated authentication or persistence fields', () => {
    const { html, text } = render();

    for (const content of [html, text]) {
      expect(content).not.toContain('resetToken');
      expect(content).not.toContain('userId');
      expect(content).not.toContain('passwordHash');
      expect(content).not.toContain('accessToken');
      expect(content).not.toContain('refreshToken');
      expect(content).not.toContain('sessionId');
      expect(content).not.toContain('codeDigest');
      expect(content).not.toContain('tokenDigest');
    }
  });

  it('rejects malformed codes and expiry values without echoing the input', () => {
    expect(() => renderPasswordResetEmail({ displayName: null, code: '<bad>', expiresInMinutes: 5 }))
      .toThrow('exactly six digits');
    expect(() => renderPasswordResetEmail({ displayName: null, code: '123456', expiresInMinutes: 0 }))
      .toThrow('positive integer');
  });
});
