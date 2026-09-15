import { describe, expect, it } from 'vitest';
import { formatRelativeActivity } from './session-recovery-formatters';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

describe('formatRelativeActivity', () => {
  it.each([
    [0, 'ahora'],
    [59_999, 'ahora'],
    [MINUTE, 'hace 1 minuto'],
    [12 * MINUTE, 'hace 12 minutos'],
    [HOUR, 'hace 1 hora'],
    [3 * HOUR, 'hace 3 horas'],
    [DAY, 'hace 1 día'],
    [4 * DAY, 'hace 4 días'],
  ])('formatea una diferencia de %i ms como %s', (elapsed, expected) => {
    expect(formatRelativeActivity(1_000, 1_000 + elapsed)).toBe(expected);
  });

  it('trata un timestamp futuro como actividad actual', () => {
    expect(formatRelativeActivity(2_000, 1_000)).toBe('ahora');
  });
});
