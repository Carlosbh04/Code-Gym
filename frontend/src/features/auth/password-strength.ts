export const PASSWORD_STRENGTH_LABELS = [
  'Muy débil',
  'Débil',
  'Aceptable',
  'Buena',
  'Fuerte',
] as const;

export function calculatePasswordStrength(password: string): number {
  if (password.length === 0) return 0;

  return Math.min(4, [
    password.length >= 15,
    /[a-z]/.test(password) && /[A-Z]/.test(password),
    /\d/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ].filter(Boolean).length);
}
