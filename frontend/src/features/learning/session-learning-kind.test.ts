import {
  describe,
  expect,
  it,
} from 'vitest';

import {
  canEnterLearningSession,
  getSessionLearningKind,
  isSessionAvailableForStage,
} from './session-learning-kind';

describe(
  'session learning metadata',
  () => {
    it(
      'treats legacy sessions as practice',
      () => {
        expect(
          getSessionLearningKind({
            kind:
              undefined,
          } as never),
        ).toBe(
          'practice',
        );
      },
    );

    it(
      'preserves explicit quiz/checkpoint kinds',
      () => {
        expect(
          getSessionLearningKind({
            kind:
              'quiz',
          } as never),
        ).toBe(
          'quiz',
        );

        expect(
          getSessionLearningKind({
            kind:
              'checkpoint',
          } as never),
        ).toBe(
          'checkpoint',
        );
      },
    );

    it(
      'blocks required session while its stage is locked',
      () => {
        expect(
          isSessionAvailableForStage(
            {
              requiredForProgression:
                true,
            } as never,
            'locked',
          ),
        ).toBe(
          false,
        );
      },
    );

    it(
      'allows optional session independently of stage lock',
      () => {
        expect(
          isSessionAvailableForStage(
            {
              requiredForProgression:
                false,
            } as never,
            'locked',
          ),
        ).toBe(
          true,
        );
      },
    );
  },
);

describe(
  'session entry canonical gate',
  () => {
    // SESSION_ENTRY_CANONICAL_GATE_MODEL_REGRESSION
    const session = {
      id:
        'staged-session',
      conceptId:
        'js-array-iteration',
      levelId:
        'foundation',
      kind:
        'practice',
      requiredForProgression:
        true,
    } as unknown as Parameters<
      typeof canEnterLearningSession
    >[0];

    const unlockedLevel = {
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
            'completed',
          completedAt:
            null,
        },
        quiz: {
          status:
            'completed',
          completedAt:
            null,
        },
        practice: {
          status:
            'available',
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

    it(
      'preserva sesiones legacy sin estado canónico',
      () => {
        expect(
          canEnterLearningSession(
            {
              ...session,
              levelId:
                undefined,
            } as never,
            undefined,
          ),
        ).toBe(
          true,
        );
      },
    );

    it(
      'falla cerrado mientras el estado staged es desconocido',
      () => {
        expect(
          canEnterLearningSession(
            session,
            undefined,
          ),
        ).toBe(
          false,
        );
      },
    );

    it(
      'bloquea cuando el nivel hereda previous-concept-incomplete',
      () => {
        expect(
          canEnterLearningSession(
            session,
            {
              ...unlockedLevel,
              locked:
                true,
              lockReason:
                'previous-concept-incomplete',
            },
          ),
        ).toBe(
          false,
        );
      },
    );

    it(
      'bloquea cuando falta completar el nivel anterior',
      () => {
        expect(
          canEnterLearningSession(
            session,
            {
              ...unlockedLevel,
              locked:
                true,
              lockReason:
                'previous-level-incomplete',
            },
          ),
        ).toBe(
          false,
        );
      },
    );

    it(
      'bloquea una práctica obligatoria si su etapa está locked',
      () => {
        expect(
          canEnterLearningSession(
            session,
            {
              ...unlockedLevel,
              stages: {
                ...unlockedLevel.stages,
                practice: {
                  status:
                    'locked',
                  completedAt:
                    null,
                },
              },
            },
          ),
        ).toBe(
          false,
        );
      },
    );

    it(
      'respeta que una sesión opcional pueda abrirse aunque la etapa esté locked',
      () => {
        expect(
          canEnterLearningSession(
            {
              ...session,
              requiredForProgression:
                false,
            } as never,
            {
              ...unlockedLevel,
              stages: {
                ...unlockedLevel.stages,
                practice: {
                  status:
                    'locked',
                  completedAt:
                    null,
                },
              },
            },
          ),
        ).toBe(
          true,
        );
      },
    );

    it(
      'permite la sesión staged cuando backend confirma el nivel y la etapa',
      () => {
        expect(
          canEnterLearningSession(
            session,
            unlockedLevel,
          ),
        ).toBe(
          true,
        );
      },
    );

    it(
      'rechaza un estado perteneciente a otro nivel',
      () => {
        expect(
          canEnterLearningSession(
            session,
            {
              ...unlockedLevel,
              levelId:
                'deepening',
            },
          ),
        ).toBe(
          false,
        );
      },
    );
  },
);
