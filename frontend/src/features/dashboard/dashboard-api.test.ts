import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import {
  ApiError,
  getDashboard,
} from './dashboard-api';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('dashboard-api', () => {
  it('consulta GET /dashboard con Bearer token y credentials include', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
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
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      ),
    );

    vi.stubGlobal('fetch', fetchMock);

    const response =
      await getDashboard('access-token-test');

    expect(response.dashboard.progress).toEqual([]);
    expect(
      response.dashboard.recentCompletedSessions,
    ).toEqual([]);

    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [
      url,
      options,
    ] = fetchMock.mock.calls[0] as [
      string,
      RequestInit,
    ];

    expect(url).toBe(
      'http://localhost:3000/dashboard',
    );

    expect(options.method).toBe('GET');
    expect(options.credentials).toBe('include');

    const headers =
      new Headers(options.headers);

    expect(
      headers.get('Authorization'),
    ).toBe(
      'Bearer access-token-test',
    );
  });

  it('conserva el contrato completo devuelto por backend', async () => {
    const payload = {
      dashboard: {
        progress: [
          {
            conceptId: 'js-arrays',
            technologyId: 'javascript',
            totalAttempts: 10,
            correctAttempts: 8,
            completedSessions: 2,
            accuracy: 0.8,
            lastPracticedAt:
              '2026-09-12T12:00:00.000Z',
          },
        ],
        recentCompletedSessions: [
          {
            id: 'completion-1',
            sessionId:
              'js-arrays-map-vs-foreach-01',
            technologyId: 'javascript',
            topicId: 'arrays',
            conceptId: 'js-arrays',
            totalExercises: 4,
            correctExercises: 3,
            accuracy: 0.75,
            durationMs: 12000,
            hintsUsed: 1,
            completedAt:
              '2026-09-12T12:00:00.000Z',
          },
        ],
        review: {
          overview: {
            totalAttempts: 10,
            correctAttempts: 8,
            accuracy: 0.8,
            evidenceLevel: 'sufficient',
          },
          candidates: [
            {
              conceptId: 'js-arrays',
              technologyId: 'javascript',
              totalAttempts: 10,
              correctAttempts: 8,
              completedSessions: 2,
              accuracy: 0.8,
              evidenceLevel: 'sufficient',
              lastPracticedAt:
                '2026-09-12T12:00:00.000Z',
              reason: 'low-accuracy',
            },
          ],
        },
        badges: {
          summary: {
            totalAttempts: 10,
            correctAttempts: 8,
            completedSessions: 2,
            accuracy: 0.8,
          },
          badges: [
            {
              id: 'first-session',
              title: 'Primera sesión',
              description:
                'Completa tu primera sesión.',
              unlocked: true,
            },
          ],
        },
      },
    } as const;

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify(payload),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      ),
    );

    vi.stubGlobal('fetch', fetchMock);

    const response =
      await getDashboard('access-token-test');

    expect(response).toEqual(payload);

    expect(
      response.dashboard.progress[0]?.accuracy,
    ).toBe(0.8);

    expect(
      response.dashboard
        .recentCompletedSessions[0]
        ?.totalExercises,
    ).toBe(4);

    expect(
      response.dashboard
        .review.candidates[0]?.reason,
    ).toBe('low-accuracy');

    expect(
      response.dashboard
        .badges.badges[0]?.unlocked,
    ).toBe(true);
  });

  it('preserva el ApiError estructurado del backend', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: {
              code: 'UNAUTHORIZED',
              message:
                'Authentication required',
            },
          }),
          {
            status: 401,
            headers: {
              'Content-Type':
                'application/json',
            },
          },
        ),
      ),
    );

    try {
      await getDashboard('invalid-token');

      throw new Error(
        'getDashboard debía fallar',
      );
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);

      const apiError =
        error as ApiError;

      expect(apiError.status).toBe(401);
      expect(apiError.code).toBe(
        'UNAUTHORIZED',
      );
      expect(apiError.message).toBe(
        'Authentication required',
      );
    }
  });
});
