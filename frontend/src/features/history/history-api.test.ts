import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import {
  ApiError,
  getHistoryAttempts,
  getHistoryCompletedSession,
} from './history-api';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('history-api', () => {
  it('lee una completed session autenticada', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            completedSession: {
              id: 'completion-1',
              sessionId:
                'js-arrays-map-vs-foreach-01',
              technologyId:
                'javascript',
              topicId:
                'js-arrays',
              conceptId:
                'js-array-iteration',
              totalExercises: 4,
              correctExercises: 3,
              accuracy: 0.75,
              durationMs: 12000,
              hintsUsed: 1,
              completedAt:
                '2026-09-12T12:00:00.000Z',
            },
          }),
          {
            status: 200,
            headers: {
              'Content-Type':
                'application/json',
            },
          },
        ),
      );

    const result =
      await getHistoryCompletedSession(
        'access-token',
        'js-arrays-map-vs-foreach-01',
      );

    expect(result).toEqual({
      completedSession: {
        id: 'completion-1',
        sessionId:
          'js-arrays-map-vs-foreach-01',
        technologyId:
          'javascript',
        topicId:
          'js-arrays',
        conceptId:
          'js-array-iteration',
        totalExercises: 4,
        correctExercises: 3,
        accuracy: 0.75,
        durationMs: 12000,
        hintsUsed: 1,
        completedAt:
          '2026-09-12T12:00:00.000Z',
      },
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [
      url,
      options,
    ] = fetchMock.mock.calls[0] ?? [];

    expect(url).toBe(
      'http://localhost:3000/history/sessions/js-arrays-map-vs-foreach-01',
    );

    expect(options).toMatchObject({
      method: 'GET',
      credentials: 'include',
    });

    const headers =
      new Headers(options?.headers);

    expect(
      headers.get('Authorization'),
    ).toBe('Bearer access-token');
  });

  it('lee attempts autenticados conservando nullables', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            attempts: [
              {
                id: 'attempt-1',
                sessionId:
                  'js-arrays-map-vs-foreach-01',
                exerciseId:
                  'step-1',
                conceptId:
                  'js-array-iteration',
                technologyId:
                  'javascript',
                isCorrect: true,
                attemptedAt:
                  '2026-09-12T12:00:00.000Z',
                durationMs: 2000,
                hintsUsed: 0,
              },
              {
                id: 'attempt-2',
                sessionId:
                  'js-arrays-map-vs-foreach-01',
                exerciseId:
                  'step-2',
                conceptId: null,
                technologyId:
                  'javascript',
                isCorrect: false,
                attemptedAt:
                  '2026-09-12T12:00:03.000Z',
                durationMs: null,
                hintsUsed: null,
              },
            ],
          }),
          {
            status: 200,
            headers: {
              'Content-Type':
                'application/json',
            },
          },
        ),
      );

    const result =
      await getHistoryAttempts(
        'access-token',
        'js-arrays-map-vs-foreach-01',
      );

    expect(result.attempts).toEqual([
      {
        id: 'attempt-1',
        sessionId:
          'js-arrays-map-vs-foreach-01',
        exerciseId:
          'step-1',
        conceptId:
          'js-array-iteration',
        technologyId:
          'javascript',
        isCorrect: true,
        attemptedAt:
          '2026-09-12T12:00:00.000Z',
        durationMs: 2000,
        hintsUsed: 0,
      },
      {
        id: 'attempt-2',
        sessionId:
          'js-arrays-map-vs-foreach-01',
        exerciseId:
          'step-2',
        conceptId: null,
        technologyId:
          'javascript',
        isCorrect: false,
        attemptedAt:
          '2026-09-12T12:00:03.000Z',
        durationMs: null,
        hintsUsed: null,
      },
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [
      url,
      options,
    ] = fetchMock.mock.calls[0] ?? [];

    expect(url).toBe(
      'http://localhost:3000/history/sessions/js-arrays-map-vs-foreach-01/attempts',
    );

    const headers =
      new Headers(options?.headers);

    expect(
      headers.get('Authorization'),
    ).toBe('Bearer access-token');

    expect(options).toMatchObject({
      method: 'GET',
      credentials: 'include',
    });
  });

  it('codifica sessionId antes de construir la URL', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            attempts: [],
          }),
          {
            status: 200,
            headers: {
              'Content-Type':
                'application/json',
            },
          },
        ),
      );

    await getHistoryAttempts(
      'access-token',
      'session/with space',
    );

    expect(
      fetchMock.mock.calls[0]?.[0],
    ).toBe(
      'http://localhost:3000/history/sessions/session%2Fwith%20space/attempts',
    );
  });

  it('conserva el error estructurado 404 del backend', async () => {
    vi.spyOn(
      globalThis,
      'fetch',
    ).mockResolvedValue(
      new Response(
        JSON.stringify({
          error: {
            code:
              'HISTORY_SESSION_NOT_FOUND',
            message:
              'History session not found',
          },
        }),
        {
          status: 404,
          headers: {
            'Content-Type':
              'application/json',
          },
        },
      ),
    );

    let thrown: unknown;

    try {
      await getHistoryCompletedSession(
        'access-token',
        'missing-session',
      );
    } catch (error: unknown) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(
      ApiError,
    );

    expect(thrown).toMatchObject({
      status: 404,
      code:
        'HISTORY_SESSION_NOT_FOUND',
      message:
        'History session not found',
    });
  });
});
