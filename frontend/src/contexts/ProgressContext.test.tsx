import type {
  ReactNode,
} from 'react';

import {
  renderHook,
} from '@testing-library/react';

import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import {
  useDashboard,
} from '@/hooks/useDashboard';

import {
  useProgress,
} from '@/hooks/useProgress';

import {
  ProgressProvider,
} from './ProgressContext';

vi.mock('@/hooks/useDashboard', () => ({
  useDashboard: vi.fn(),
}));

const dashboardMock =
  vi.mocked(useDashboard);

function wrapper({
  children,
}: {
  readonly children: ReactNode;
}) {
  return (
    <ProgressProvider>
      {children}
    </ProgressProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();

  dashboardMock.mockReturnValue({
    dashboard: {
      progress: [],
      recentCompletedSessions: [],
      review: {
        overview: {
          totalAttempts: 0,
          correctAttempts: 0,
          accuracy: null,
          evidenceLevel: 'none',
        },
        candidates: [],
      },
      badges: {
        summary: {
          totalAttempts: 0,
          correctAttempts: 0,
          completedSessions: 0,
          accuracy: null,
        },
        badges: [],
      },
    },
    isLoading: false,
    error: null,
    refresh: vi.fn(),
    resetState: vi.fn(),
  });
});

describe(
  'ProgressProvider backend-authoritative',
  () => {
    it(
      'proyecta dashboard.progress sin fabricar campos legacy',
      () => {
        dashboardMock.mockReturnValue({
          dashboard: {
            progress: [
              {
                conceptId: 'arrays',
                technologyId:
                  'javascript',
                totalAttempts: 5,
                correctAttempts: 4,
                completedSessions: 2,
                accuracy: 0.8,
                lastPracticedAt:
                  '2026-09-12T20:00:00.000Z',
              },
            ],
            recentCompletedSessions: [],
            review: {
              overview: {
                totalAttempts: 5,
                correctAttempts: 4,
                accuracy: 0.8,
                evidenceLevel:
                  'sufficient',
              },
              candidates: [],
            },
            badges: {
              summary: {
                totalAttempts: 5,
                correctAttempts: 4,
                completedSessions: 2,
                accuracy: 0.8,
              },
              badges: [],
            },
          },
          isLoading: false,
          error: null,
          refresh: vi.fn(),
          resetState: vi.fn(),
        });

        const { result } =
          renderHook(
            () => useProgress(),
            { wrapper },
          );

        const progress =
          result.current.progress.get(
            'arrays',
          );

        expect(progress).toEqual({
          conceptId: 'arrays',
          technologyId:
            'javascript',
          totalAttempts: 5,
          correctAttempts: 4,
          completedSessions: 2,
          accuracy: 0.8,
          lastPracticed:
            '2026-09-12T20:00:00.000Z',
        });

        expect(progress).not
          .toHaveProperty('domain');

        expect(progress).not
          .toHaveProperty(
            'difficultyDistribution',
          );

        expect(progress).not
          .toHaveProperty(
            'recentErrors',
          );

        expect(progress).not
          .toHaveProperty(
            'schemaVersion',
          );
      },
    );

    it(
      'propaga loading y error desde Dashboard',
      () => {
        dashboardMock.mockReturnValue({
          dashboard: null,
          isLoading: true,
          error:
            'dashboard unavailable',
          refresh: vi.fn(),
          resetState: vi.fn(),
        });

        const { result } =
          renderHook(
            () => useProgress(),
            { wrapper },
          );

        expect(
          result.current.isLoading,
        ).toBe(true);

        expect(
          result.current.error,
        ).toBe(
          'dashboard unavailable',
        );

        expect(
          result.current.progress.size,
        ).toBe(0);
      },
    );

    it(
      'no expone escritura local',
      () => {
        const { result } =
          renderHook(
            () => useProgress(),
            { wrapper },
          );

        expect(
          result.current.updateProgress,
        ).toBeUndefined();

        expect(
          result.current.resetState,
        ).toBeUndefined();

        expect(
          result.current.getConceptDomain,
        ).toBeUndefined();
      },
    );
  },
);
