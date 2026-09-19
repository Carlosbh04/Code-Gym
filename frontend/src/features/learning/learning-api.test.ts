import {
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import {
  LearningApi,
} from './learning-api';

const state = {
  conceptId:
    'js-array-iteration',

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
} as const;

const levelState = {
  conceptId:
    'js-array-iteration',

  levelId:
    'foundation',

  previousLevelId:
    null,

  nextLevelId:
    'deepening',

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
} as const;

describe(
  'LearningApi',
  () => {
    it(
      'loads canonical concept state from backend',
      async () => {
        const get =
          vi.fn()
            .mockResolvedValue({
              state,
            });

        const api =
          new LearningApi({
            get,

            post:
              vi.fn(),
          });

        await expect(
          api.getConceptState(
            'js-array-iteration',
            'access-token-test',
          ),
        ).resolves.toEqual(
          state,
        );

        expect(
          get,
        ).toHaveBeenCalledWith(
          '/learning/concepts/js-array-iteration/state',
          'access-token-test',
        );
      },
    );

    it(
      'loads canonical learning level state from backend',
      async () => {
        const get =
          vi.fn()
            .mockResolvedValue({
              state:
                levelState,
            });

        const api =
          new LearningApi({
            get,

            post:
              vi.fn(),
          });

        await expect(
          api.getLevelState(
            'js-array-iteration',
            'foundation',
            'access-token-test',
          ),
        ).resolves.toEqual(
          levelState,
        );

        expect(
          get,
        ).toHaveBeenCalledWith(
          '/learning/concepts/js-array-iteration/levels/foundation/state',
          'access-token-test',
        );
      },
    );

    it(
      'completes theory for the requested learning level',
      async () => {
        const post =
          vi.fn()
            .mockResolvedValue({
              state:
                levelState,
            });

        const api =
          new LearningApi({
            get:
              vi.fn(),

            post,
          });

        await expect(
          api.completeLevelTheory(
            'js-array-iteration',
            'foundation',
            'access-token-test',
          ),
        ).resolves.toEqual(
          levelState,
        );

        expect(
          post,
        ).toHaveBeenCalledWith(
          '/learning/concepts/js-array-iteration/levels/foundation/theory/complete',
          {},
          'access-token-test',
        );
      },
    );

    it(
      'completes theory without sending user or timestamp',
      async () => {
        const post =
          vi.fn()
            .mockResolvedValue({
              state,
            });

        const api =
          new LearningApi({
            get:
              vi.fn(),

            post,
          });

        await api.completeTheory(
          'js-array-iteration',
          'access-token-test',
        );

        expect(
          post,
        ).toHaveBeenCalledWith(
          '/learning/concepts/js-array-iteration/theory/complete',
          {},
          'access-token-test',
        );
      },
    );
  },
);
