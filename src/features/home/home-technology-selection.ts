import type { SessionRecoverySnapshot } from '@/lib/recovery/ISessionRecoveryStore';
import type { ProgressContextValue } from '@/types/progress';
import type { HomeCatalog, HomeTechnologyProgress } from './home-types';

export const HOME_TECHNOLOGY_LIMIT = 6;

interface SelectHomeTechnologiesInput {
  items: HomeTechnologyProgress[];
  catalog: HomeCatalog;
  progress: ProgressContextValue['progress'];
  recovery: SessionRecoverySnapshot | null;
  discoverySeed: string;
  limit?: number;
}

interface TechnologyActivity {
  item: HomeTechnologyProgress;
  canonicalIndex: number;
  hasRecovery: boolean;
  totalAttempts: number;
  completedSessions: number;
  lastActivity: string;
}

export function selectHomeTechnologies({
  items,
  catalog,
  progress,
  recovery,
  discoverySeed,
  limit = HOME_TECHNOLOGY_LIMIT,
}: SelectHomeTechnologiesInput): HomeTechnologyProgress[] {
  if (limit <= 0 || items.length === 0) return [];

  const recoveryTechnologyId = recovery === null
    ? null
    : catalog.technologies.find(({ sessions }) =>
      sessions.some(({ session }) => session.id === recovery.sessionId),
    )?.technology.id ?? null;
  const catalogByTechnology = new Map(
    catalog.technologies.map((entry) => [entry.technology.id, entry]),
  );
  const activity = items.map((item, canonicalIndex): TechnologyActivity => {
    const catalogTechnology = catalogByTechnology.get(item.technology.id);
    const conceptProgress = catalogTechnology?.concepts.flatMap((concept) => {
      const value = progress.get(concept.id);
      return value === undefined ? [] : [value];
    }) ?? [];
    const completions = catalogTechnology?.sessions.flatMap(({ session }) => {
      const completion = catalog.completionBySession.get(session.id);
      return completion !== null
        && completion !== undefined
        && completion.technologyId === item.technology.id
        ? [completion]
        : [];
    }) ?? [];
    const lastActivity = [
      ...conceptProgress.map((value) => value.lastPracticed),
      ...completions.map((completion) => completion.completedAt),
    ].sort((left, right) => right.localeCompare(left))[0] ?? '';

    return {
      item,
      canonicalIndex,
      hasRecovery: item.technology.id === recoveryTechnologyId,
      totalAttempts: conceptProgress.reduce(
        (total, value) => total + value.totalAttempts,
        0,
      ),
      completedSessions: completions.length,
      lastActivity,
    };
  });
  const active = activity
    .filter((entry) =>
      entry.hasRecovery
      || entry.totalAttempts > 0
      || entry.completedSessions > 0,
    )
    .sort(compareTechnologyActivity);
  const selectedActive = active.slice(0, limit);
  if (selectedActive.length === limit) {
    return selectedActive.map(({ item }) => item);
  }

  const activeIds = new Set(active.map(({ item }) => item.technology.id));
  const inactive = activity.filter(({ item }) => !activeIds.has(item.technology.id));
  const discovery = items.length <= limit
    ? inactive
    : rotate(inactive, discoveryOffset(discoverySeed, inactive.length));

  return [
    ...selectedActive,
    ...discovery.slice(0, limit - selectedActive.length),
  ].map(({ item }) => item);
}

export function createHomeDiscoverySeed(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function compareTechnologyActivity(
  left: TechnologyActivity,
  right: TechnologyActivity,
): number {
  if (left.hasRecovery !== right.hasRecovery) return left.hasRecovery ? -1 : 1;
  if (left.totalAttempts !== right.totalAttempts) {
    return right.totalAttempts - left.totalAttempts;
  }
  if (left.completedSessions !== right.completedSessions) {
    return right.completedSessions - left.completedSessions;
  }
  const recency = right.lastActivity.localeCompare(left.lastActivity);
  return recency !== 0 ? recency : left.canonicalIndex - right.canonicalIndex;
}

function discoveryOffset(seed: string, length: number): number {
  if (length <= 1) return 0;
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(seed);
  if (dateMatch !== null) {
    const [, year, month, day] = dateMatch;
    const dayNumber = Math.floor(
      Date.UTC(Number(year), Number(month) - 1, Number(day)) / 86_400_000,
    );
    return dayNumber % length;
  }

  let hash = 0;
  for (const character of seed) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }
  return hash % length;
}

function rotate<T>(items: T[], offset: number): T[] {
  return [...items.slice(offset), ...items.slice(0, offset)];
}
