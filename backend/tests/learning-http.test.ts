import express, {
  type RequestHandler,
} from 'express';

import request from 'supertest';

import {
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import {
  conceptIdSchema,
} from '../src/content/content-id.js';

import {
  LearningConceptLockedError,
  LearningConceptNotFoundError,
  LearningLevelLockedError,
  LearningLevelNotConfiguredError,
  LearningLevelTheoryUnavailableError,
  type ConceptLearningStateView,
  type LearningLevelStateView,
  type LearningProgressService,
} from '../src/progress/learning-progress-service.js';

import {
  createLearningRouter,
} from '../src/routes/learning.js';

const conceptId =
  conceptIdSchema.parse(
    'js-array-basics',
  );

const fixedNow =
  new Date(
    '2026-09-17T12:00:00.000Z',
  );

function state():
ConceptLearningStateView {
  return {
    conceptId,

    previousConceptId:
      null,

    locked:
      false,

    lockReason:
      null,

    stages: {
      theory: {
        status:
          'available',

        completedAt:
          null,
      },

      quiz: {
        status:
          'locked',

        completedAt:
          null,
      },

      practice: {
        status:
          'locked',

        completedAt:
          null,
      },

      checkpoint: {
        status:
          'locked',

        completedAt:
          null,
      },
    },

    completed:
      false,

    completedAt:
      null,
  };
}

function levelState(
  levelId:
    'FOUNDATION'
    | 'DEEPENING'
    | 'MASTERY'
    = 'FOUNDATION',
): LearningLevelStateView {
  return {
    conceptId,
    levelId,
    previousLevelId:
      levelId === 'FOUNDATION'
        ? null
        : 'FOUNDATION',
    nextLevelId:
      levelId === 'FOUNDATION'
        ? 'DEEPENING'
        : levelId === 'DEEPENING'
          ? 'MASTERY'
          : null,
    locked:
      false,
    lockReason:
      null,
    stages: {
      theory: {
        status:
          'available',
        completedAt:
          null,
      },
      quiz: {
        status:
          'locked',
        completedAt:
          null,
      },
      practice: {
        status:
          'locked',
        completedAt:
          null,
      },
      checkpoint: {
        status:
          'locked',
        completedAt:
          null,
      },
    },
    completed:
      false,
    completedAt:
      null,
  };
}

function authenticated():
RequestHandler {
  return (
    request,
    _response,
    next,
  ) => {
    request.auth = {
      userId:
        'user-1',

      sessionId:
        'session-1',
    };

    next();
  };
}

function appWith(
  learningProgressService:
    Partial<
      Pick<
        LearningProgressService,
        | 'getState'
        | 'completeTheory'
        | 'getLevelState'
        | 'completeLevelTheory'
      >
    >,
) {
  const app =
    express();

  const routerLearningProgressService = {
    getState:
      learningProgressService
        .getState
      ?? vi.fn(),
    completeTheory:
      learningProgressService
        .completeTheory
      ?? vi.fn(),
    getLevelState:
      learningProgressService
        .getLevelState
      ?? vi.fn(),
    completeLevelTheory:
      learningProgressService
        .completeLevelTheory
      ?? vi.fn(),
  };

  app.use(
    express.json(),
  );

  app.use(
    createLearningRouter({
      learningProgressService:
        routerLearningProgressService,
      requireAuth:
        authenticated(),
    }),
  );

  return app;
}

describe(
  'learning HTTP',
  () => {
    it(
      'returns canonical learning state',
      async () => {
        const getState =
          vi.fn()
            .mockResolvedValue(
              state(),
            );

        const response =
          await request(
            appWith({
              getState,
              completeTheory:
                vi.fn(),
            }),
          )
            .get(
              `/learning/concepts/${conceptId}/state`,
            );

        expect(
          response.status,
        ).toBe(
          200,
        );

        expect(
          getState,
        ).toHaveBeenCalledWith(
          'user-1',
          conceptId,
        );
      },
    );

    it(
      'uses authenticated user and ignores browser-owned timestamp when completing theory',
      async () => {
        const completeTheory =
          vi.fn()
            .mockResolvedValue({
              ...state(),

              stages: {
                ...state().stages,

                theory: {
                  status:
                    'completed',

                  completedAt:
                    fixedNow.toISOString(),
                },

                quiz: {
                  status:
                    'available',

                  completedAt:
                    null,
                },
              },
            });

        const response =
          await request(
            appWith({
              getState:
                vi.fn(),

              completeTheory,
            }),
          )
            .post(
              `/learning/concepts/${conceptId}/theory/complete`,
            )
            .send({
              userId:
                'attacker-user',

              completedAt:
                '1999-01-01T00:00:00.000Z',
            });

        expect(
          response.status,
        ).toBe(
          200,
        );

        expect(
          completeTheory,
        ).toHaveBeenCalledWith(
          'user-1',
          conceptId,
        );
      },
    );

    it(
      'returns 404 for unpublished or missing concept',
      async () => {
        const response =
          await request(
            appWith({
              getState:
                vi.fn()
                  .mockRejectedValue(
                    new LearningConceptNotFoundError(
                      conceptId,
                    ),
                  ),

              completeTheory:
                vi.fn(),
            }),
          )
            .get(
              `/learning/concepts/${conceptId}/state`,
            );

        expect(
          response.status,
        ).toBe(
          404,
        );
      },
    );

    it(
      'returns 409 when direct theory completion attempts to bypass prerequisite',
      async () => {
        const response =
          await request(
            appWith({
              getState:
                vi.fn(),

              completeTheory:
                vi.fn()
                  .mockRejectedValue(
                    new LearningConceptLockedError(
                      conceptId,
                      conceptIdSchema.parse(
                        'js-array-previous',
                      ),
                    ),
                  ),
            }),
          )
            .post(
              `/learning/concepts/${conceptId}/theory/complete`,
            );

        expect(
          response.status,
        ).toBe(
          409,
        );

        expect(
          response.body,
        ).toMatchObject({
          error: {
            code:
              'LEARNING_CONCEPT_LOCKED',
          },
        });
      },
    );

    it(
      'rejects invalid concept id',
      async () => {
        const response =
          await request(
            appWith({
              getState:
                vi.fn(),

              completeTheory:
                vi.fn(),
            }),
          )
            .get(
              '/learning/concepts/INVALID_ID/state',
            );

        expect(
          response.status,
        ).toBe(
          400,
        );
      },
    );
  },
);

describe(
  'learning HTTP levels',
  () => {
    it(
      'maps public foundation to the internal level and returns public lowercase ids',
      async () => {
        const getLevelState =
          vi.fn()
            .mockResolvedValue(
              levelState(),
            );

        const response =
          await request(
            appWith({
              getLevelState,
            }),
          )
            .get(
              `/learning/concepts/${conceptId}/levels/foundation/state`,
            );

        expect(
          response.status,
        ).toBe(
          200,
        );

        expect(
          getLevelState,
        ).toHaveBeenCalledWith(
          'user-1',
          conceptId,
          'FOUNDATION',
        );

        expect(
          response.body.state,
        ).toMatchObject({
          conceptId,
          levelId:
            'foundation',
          previousLevelId:
            null,
          nextLevelId:
            'deepening',
        });
      },
    );

    it(
      'completes level theory using authenticated user and route-owned level',
      async () => {
        const completeLevelTheory =
          vi.fn()
            .mockResolvedValue(
              levelState(),
            );

        const response =
          await request(
            appWith({
              completeLevelTheory,
            }),
          )
            .post(
              `/learning/concepts/${conceptId}/levels/foundation/theory/complete`,
            )
            .send({
              userId:
                'attacker-user',
              levelId:
                'mastery',
              completedAt:
                '1999-01-01T00:00:00.000Z',
            });

        expect(
          response.status,
        ).toBe(
          200,
        );

        expect(
          completeLevelTheory,
        ).toHaveBeenCalledWith(
          'user-1',
          conceptId,
          'FOUNDATION',
        );

        expect(
          response.body.state,
        ).toMatchObject({
          conceptId,
          levelId:
            'foundation',
          previousLevelId:
            null,
          nextLevelId:
            'deepening',
        });
      },
    );

    it(
      'rejects invalid public learning level id',
      async () => {
        const getLevelState =
          vi.fn();

        const response =
          await request(
            appWith({
              getLevelState,
            }),
          )
            .get(
              `/learning/concepts/${conceptId}/levels/FOUNDATION/state`,
            );

        expect(
          response.status,
        ).toBe(
          400,
        );

        expect(
          response.body,
        ).toMatchObject({
          error: {
            code:
              'INVALID_LEARNING_LEVEL_ID',
          },
        });

        expect(
          getLevelState,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      'returns 404 when requested level is not configured for the concept',
      async () => {
        const getLevelState =
          vi.fn()
            .mockRejectedValue(
              new LearningLevelNotConfiguredError(
                conceptId,
                'MASTERY',
              ),
            );

        const response =
          await request(
            appWith({
              getLevelState,
            }),
          )
            .get(
              `/learning/concepts/${conceptId}/levels/mastery/state`,
            );

        expect(
          response.status,
        ).toBe(
          404,
        );

        expect(
          response.body,
        ).toMatchObject({
          error: {
            code:
              'LEARNING_LEVEL_NOT_CONFIGURED',
          },
        });
      },
    );

    it(
      'returns 409 when previous learning level is incomplete',
      async () => {
        const completeLevelTheory =
          vi.fn()
            .mockRejectedValue(
              new LearningLevelLockedError(
                conceptId,
                'DEEPENING',
                'FOUNDATION',
              ),
            );

        const response =
          await request(
            appWith({
              completeLevelTheory,
            }),
          )
            .post(
              `/learning/concepts/${conceptId}/levels/deepening/theory/complete`,
            );

        expect(
          response.status,
        ).toBe(
          409,
        );

        expect(
          response.body,
        ).toMatchObject({
          error: {
            code:
              'LEARNING_LEVEL_LOCKED',
          },
        });
      },
    );

    it(
      'returns 409 when previous concept is incomplete',
      async () => {
        const completeLevelTheory =
          vi.fn()
            .mockRejectedValue(
              new LearningConceptLockedError(
                conceptId,
                conceptIdSchema.parse(
                  'js-array-previous',
                ),
              ),
            );

        const response =
          await request(
            appWith({
              completeLevelTheory,
            }),
          )
            .post(
              `/learning/concepts/${conceptId}/levels/foundation/theory/complete`,
            );

        expect(
          response.status,
        ).toBe(
          409,
        );

        expect(
          response.body,
        ).toMatchObject({
          error: {
            code:
              'LEARNING_CONCEPT_LOCKED',
          },
        });
      },
    );

    it(
      'returns 422 when configured unlocked level has no theory content',
      async () => {
        const completeLevelTheory =
          vi.fn()
            .mockRejectedValue(
              new LearningLevelTheoryUnavailableError(
                conceptId,
                'DEEPENING',
              ),
            );

        const response =
          await request(
            appWith({
              completeLevelTheory,
            }),
          )
            .post(
              `/learning/concepts/${conceptId}/levels/deepening/theory/complete`,
            );

        expect(
          response.status,
        ).toBe(
          422,
        );

        expect(
          response.body,
        ).toMatchObject({
          error: {
            code:
              'LEARNING_LEVEL_THEORY_UNAVAILABLE',
          },
        });
      },
    );
  },
);
