export function formatDuration(milliseconds: number): string {
  const seconds = Math.max(0, Math.round(milliseconds / 1_000));
  if (seconds < 60) return `${seconds} s`;
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return remainder === 0 ? `${minutes} min` : `${minutes} min ${remainder} s`;
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium' }).format(new Date(iso));
}

export function formatRelativeDate(iso: string, now = Date.now()): string {
  const timestamp = new Date(iso).getTime();
  const difference = timestamp - now;
  const formatter = new Intl.RelativeTimeFormat('es-ES', { numeric: 'always' });
  const ranges = [
    { limit: 60_000, size: 1_000, unit: 'second' },
    { limit: 3_600_000, size: 60_000, unit: 'minute' },
    { limit: 86_400_000, size: 3_600_000, unit: 'hour' },
    { limit: 604_800_000, size: 86_400_000, unit: 'day' },
    { limit: 2_629_800_000, size: 604_800_000, unit: 'week' },
    { limit: 31_557_600_000, size: 2_629_800_000, unit: 'month' },
    { limit: Number.POSITIVE_INFINITY, size: 31_557_600_000, unit: 'year' },
  ] as const;
  const range = ranges.find(({ limit }) => Math.abs(difference) < limit) ?? ranges.at(-1);

  if (range === undefined) return formatDate(iso);
  if (Math.abs(difference) < 30_000) return 'ahora';

  return formatter.format(Math.round(difference / range.size), range.unit);
}
