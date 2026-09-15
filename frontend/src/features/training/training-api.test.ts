import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import {
  revealTrainingHint,
  startTrainingRun,
  submitTrainingAnswer,
} from './training-api';

describe('training-api', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('starts an authenticated training run without sending user-owned metadata', async () => {
    const fetchMock =
      vi.spyOn(globalThis, 'fetch')
        .mockResolvedValue(
          new Response(
            JSON.stringify({
              run: {
                id: 'run-1',
                sessionId:
                  'js-arrays-map-vs-foreach-01',
                technologyId:
                  'javascript',
                topicId:
                  'js-arrays',
                conceptId:
                  'js-array-iteration',
                status:
                  'active',
                totalExercises:
                  4,
                answeredExercises:
                  0,
                correctExercises:
                  0,
                durationMs:
                  0,
                hintsUsed:
                  0,
                startedAt:
                  '2026-09-12T12:00:00.000Z',
                completedAt:
                  null,
              },
            }),
            {
              status: 201,
              headers: {
                'Content-Type':
                  'application/json',
              },
            },
          ),
        );

    await startTrainingRun(
      'access-token',
      'js-arrays-map-vs-foreach-01',
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [
      url,
      init,
    ] = fetchMock.mock.calls[0];

    expect(String(url)).toContain(
      '/training/runs',
    );

    expect(init).toMatchObject({
      method: 'POST',
      credentials: 'include',
    });

    const headers =
      new Headers(init?.headers);

    expect(
      headers.get('Authorization'),
    ).toBe(
      'Bearer access-token',
    );

    const body =
      JSON.parse(
        String(init?.body),
      );

    expect(body).toEqual({
      sessionId:
        'js-arrays-map-vs-foreach-01',
    });

    expect(body).not.toHaveProperty(
      'userId',
    );

    expect(body).not.toHaveProperty(
      'technologyId',
    );

    expect(body).not.toHaveProperty(
      'conceptId',
    );
  });

  it('submits only the public answer contract and receives server correctness', async () => {
    const fetchMock =
      vi.spyOn(globalThis, 'fetch')
        .mockResolvedValue(
          new Response(
            JSON.stringify({
              result: {
                attempt: {
                  id: 'attempt-1',
                  exerciseId: 'step-1',
                  isCorrect: true,
                  attemptedAt:
                    '2026-09-12T12:00:01.000Z',
                  durationMs: 1250,
                  hintsUsed: 1,
                },
                run: {
                  id: 'run-1',
                  sessionId:
                    'js-arrays-map-vs-foreach-01',
                  technologyId:
                    'javascript',
                  topicId:
                    'js-arrays',
                  conceptId:
                    'js-array-iteration',
                  status:
                    'active',
                  totalExercises:
                    4,
                  answeredExercises:
                    1,
                  correctExercises:
                    1,
                  durationMs:
                    1250,
                  hintsUsed:
                    1,
                  startedAt:
                    '2026-09-12T12:00:00.000Z',
                  completedAt:
                    null,
                },
                completion:
                  null,
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

    const response =
      await submitTrainingAnswer(
        'access-token',
        'run-1',
        {
          exerciseId:
            'step-1',
          answer:
            'b',
          durationMs:
            1250,
        },
      );

    expect(
      response.result.attempt.isCorrect,
    ).toBe(true);

    const [
      url,
      init,
    ] = fetchMock.mock.calls[0];

    expect(String(url)).toContain(
      '/training/runs/run-1/answers',
    );

    const body =
      JSON.parse(
        String(init?.body),
      );

    expect(body).toEqual({
      exerciseId:
        'step-1',
      answer:
        'b',
      durationMs:
        1250,
    });

    for (
      const forbidden of [
        'userId',
        'sessionId',
        'technologyId',
        'topicId',
        'conceptId',
        'stepType',
        'isCorrect',
        'accuracy',
        'correctAttempts',
        'completedSessions',
      ]
    ) {
      expect(body).not.toHaveProperty(
        forbidden,
      );
    }
  });

  it('preserves structured API errors from the shared HTTP client', async () => {
    vi.spyOn(
      globalThis,
      'fetch',
    ).mockResolvedValue(
      new Response(
        JSON.stringify({
          error: {
            code:
              'ANSWER_ALREADY_SUBMITTED',
            message:
              'Exercise was already answered in this training run',
          },
        }),
        {
          status: 409,
          headers: {
            'Content-Type':
              'application/json',
          },
        },
      ),
    );

    await expect(
      submitTrainingAnswer(
        'access-token',
        'run-1',
        {
          exerciseId:
            'step-1',
          answer:
            'b',
          durationMs:
            100,
        },
      ),
    ).rejects.toMatchObject({
      status: 409,
      code:
        'ANSWER_ALREADY_SUBMITTED',
    });
  });

  it('requests only the next hint for the selected exercise', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          hint: {
            index: 0,
            text: 'Pista del servidor',
            totalHints: 2,
          },
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    );

    await expect(
      revealTrainingHint('access-token', 'run/one', 'step-1'),
    ).resolves.toEqual({
      hint: {
        index: 0,
        text: 'Pista del servidor',
        totalHints: 2,
      },
    });
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('/training/runs/run%2Fone/hints');
    expect(JSON.parse(String(init?.body))).toEqual({ exerciseId: 'step-1' });
  });
});
