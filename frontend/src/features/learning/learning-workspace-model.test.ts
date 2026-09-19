import {
  describe,
  expect,
  it,
} from 'vitest';

import {
  filterLearningContentByLevel,
  getLearningSectionLevelId,
  groupLearningSessionsByLevel,
  getSessionLearningLevelId,
  canOpenLearningStage,
  countCompletedConcepts,
  groupLearningSessions,
  resolveCurrentLearningStage,
  resolveActiveLearningLevelId,
} from './learning-workspace-model';

import type {
  ConceptLearningState,
  LearningLevelState,
} from './learning-types';

import type {
  ExerciseSession,
} from '@/types/exercise';


const baseState:
  ConceptLearningState = {
    conceptId:
      'concept-1',

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

describe(
  'learning theory levels',
  () => {
    it(
      'treats a legacy theory section without levelId as foundation',
      () => {
        expect(
          getLearningSectionLevelId({
            type:
              'intro',
            title:
              'Legacy',
            body:
              'Contenido legacy',
          }),
        ).toBe(
          'foundation',
        );
      },
    );

    it(
      'filters structured theory by learning level',
      () => {
        const content = {
          sections: [
            {
              type:
                'intro' as const,
              levelId:
                'foundation' as const,
              title:
                'Fundamentos',
              body:
                'Base',
            },
            {
              type:
                'intro' as const,
              levelId:
                'deepening' as const,
              title:
                'Profundización',
              body:
                'Detalle',
            },
          ],
        };

        expect(
          filterLearningContentByLevel(
            content,
            'foundation',
          ),
        ).toEqual({
          sections: [
            content.sections[0],
          ],
        });

        expect(
          filterLearningContentByLevel(
            content,
            'deepening',
          ),
        ).toEqual({
          sections: [
            content.sections[1],
          ],
        });

        expect(
          filterLearningContentByLevel(
            content,
            'mastery',
          ),
        ).toBeUndefined();
      },
    );
  },
);

describe(
  'learning workspace model',
  () => {
    it(
      'keeps legacy sessions outside staged mode',
      () => {
        const result =
          groupLearningSessions([
            {
              id:
                'practice-1',

              kind:
                'practice',
            } as never,
          ]);

        expect(
          result.staged,
        ).toBe(
          false,
        );

        expect(
          result.practices,
        ).toHaveLength(
          1,
        );
      },
    );

    it(
      'enables staged mode only with a required quiz',
      () => {
        const result =
          groupLearningSessions([
            {
              id:
                'quiz-1',

              kind:
                'quiz',

              requiredForProgression:
                true,
            } as never,

            {
              id:
                'practice-1',

              kind:
                'practice',
            } as never,

            {
              id:
                'checkpoint-1',

              kind:
                'checkpoint',
            } as never,
          ]);

        expect(
          result.staged,
        ).toBe(
          true,
        );

        expect(
          result.quiz?.id,
        ).toBe(
          'quiz-1',
        );

        expect(
          result.checkpoint?.id,
        ).toBe(
          'checkpoint-1',
        );
      },
    );

    it(
      'selects theory as the first incomplete stage',
      () => {
        expect(
          resolveCurrentLearningStage(
            baseState,
          ),
        ).toBe(
          'theory',
        );
      },
    );

    it(
      'moves to practice only after quiz completion',
      () => {
        const state:
          ConceptLearningState = {
            ...baseState,

            stages: {
              theory: {
                status:
                  'completed',

                completedAt:
                  '2026-09-17T12:00:00.000Z',
              },

              quiz: {
                status:
                  'completed',

                completedAt:
                  '2026-09-17T12:01:00.000Z',
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
          };

        expect(
          resolveCurrentLearningStage(
            state,
          ),
        ).toBe(
          'practice',
        );

        expect(
          canOpenLearningStage(
            state,
            'practice',
          ),
        ).toBe(
          true,
        );

        expect(
          canOpenLearningStage(
            state,
            'checkpoint',
          ),
        ).toBe(
          false,
        );
      },
    );

    it(
      'does not open any stage of a locked concept',
      () => {
        const state = {
          ...baseState,
          locked:
            true,
        };

        expect(
          canOpenLearningStage(
            state,
            'theory',
          ),
        ).toBe(
          false,
        );
      },
    );

    it(
      'counts only canonically completed concepts',
      () => {
        expect(
          countCompletedConcepts(
            [
              {
                id:
                  'concept-1',
              },

              {
                id:
                  'concept-2',
              },
            ],
            {
              'concept-1': {
                ...baseState,
                completed:
                  true,

                completedAt:
                  '2026-09-17T12:00:00.000Z',
              },
            },
          ),
        ).toBe(
          1,
        );
      },
    );
  },
);

describe('learning levels', () => {
  it(
    'agrupa quiz, prácticas y checkpoint dentro de su nivel',
    () => {
      const sessions:
        ExerciseSession[] = [
        {
          id: 'quiz-foundation',
          title: 'Quiz foundation',
          conceptId: 'concept-1',
          technologyId: 'javascript',
          difficulty: 'beginner',
          kind: 'quiz',
          levelId: 'foundation',
          requiredForProgression: true,
          passingPercentage: 100,
          version: '1',
          status: 'published',
          createdAt: '2026-09-17T00:00:00.000Z',
          updatedAt: null,
          steps: [],
        },
        {
          id: 'practice-foundation',
          title: 'Practice foundation',
          conceptId: 'concept-1',
          technologyId: 'javascript',
          difficulty: 'beginner',
          kind: 'practice',
          levelId: 'foundation',
          requiredForProgression: true,
          version: '1',
          status: 'published',
          createdAt: '2026-09-17T00:00:00.000Z',
          updatedAt: null,
          steps: [],
        },
        {
          id: 'checkpoint-foundation',
          title: 'Checkpoint foundation',
          conceptId: 'concept-1',
          technologyId: 'javascript',
          difficulty: 'beginner',
          kind: 'checkpoint',
          levelId: 'foundation',
          requiredForProgression: true,
          version: '1',
          status: 'published',
          createdAt: '2026-09-17T00:00:00.000Z',
          updatedAt: null,
          steps: [],
        },
        {
          id: 'quiz-deepening',
          title: 'Quiz deepening',
          conceptId: 'concept-1',
          technologyId: 'javascript',
          difficulty: 'intermediate',
          kind: 'quiz',
          levelId: 'deepening',
          requiredForProgression: true,
          passingPercentage: 100,
          version: '1',
          status: 'published',
          createdAt: '2026-09-17T00:00:00.000Z',
          updatedAt: null,
          steps: [],
        },
      ];

      const grouped =
        groupLearningSessionsByLevel(
          sessions,
          [
            'foundation',
            'deepening',
          ],
        );

      expect(
        grouped.foundation?.quiz?.id,
      ).toBe(
        'quiz-foundation',
      );

      expect(
        grouped.foundation?.practices.map(
          session => session.id,
        ),
      ).toEqual([
        'practice-foundation',
      ]);

      expect(
        grouped.foundation?.checkpoint?.id,
      ).toBe(
        'checkpoint-foundation',
      );

      expect(
        grouped.deepening?.quiz?.id,
      ).toBe(
        'quiz-deepening',
      );

      expect(
        grouped.deepening?.practices,
      ).toEqual([]);

      expect(
        grouped.mastery,
      ).toBeUndefined();
    },
  );

  it(
    'solo crea grupos para los niveles configurados',
    () => {
      const grouped =
        groupLearningSessionsByLevel(
          [],
          [
            'deepening',
          ],
        );

      expect(
        grouped.deepening,
      ).toEqual(
        expect.objectContaining({
          levelId:
            'deepening',

          practices:
            [],
        }),
      );

      expect(
        grouped.foundation,
      ).toBeUndefined();

      expect(
        grouped.mastery,
      ).toBeUndefined();
    },
  );

  it(
    'trata una sesión legacy sin levelId como foundation',
    () => {
      const session:
        ExerciseSession = {
        id: 'legacy-practice',
        title: 'Legacy practice',
        conceptId: 'concept-1',
        technologyId: 'javascript',
        difficulty: 'beginner',
        kind: 'practice',
        requiredForProgression: true,
        version: '1',
        status: 'published',
        createdAt: '2026-09-17T00:00:00.000Z',
        updatedAt: null,
        steps: [],
      };

      expect(
        getSessionLearningLevelId(
          session,
        ),
      ).toBe(
        'foundation',
      );

      const grouped =
        groupLearningSessionsByLevel(
          [
            session,
          ],
          [
            'foundation',
          ],
        );

      expect(
        grouped.foundation?.practices
          .map(item => item.id),
      ).toEqual([
        'legacy-practice',
      ]);
    },
  );
});

describe(
  'active learning level',
  () => {
    const levels = [
      {
        id:
          'mastery',
        name:
          'Dominio',
        description:
          'Nivel final.',
        position:
          2,
      },
      {
        id:
          'foundation',
        name:
          'Fundamentos',
        description:
          'Nivel inicial.',
        position:
          0,
      },
      {
        id:
          'deepening',
        name:
          'Profundización',
        description:
          'Nivel intermedio.',
        position:
          1,
      },
    ] as const;

    const levelState = (
      levelId:
        'foundation'
        | 'deepening'
        | 'mastery',

      completed:
        boolean,
    ): LearningLevelState => ({
      conceptId:
        'concept-1',

      levelId,

      previousLevelId:
        levelId === 'foundation'
          ? null
          : levelId === 'deepening'
            ? 'foundation'
            : 'deepening',

      nextLevelId:
        levelId === 'foundation'
          ? 'deepening'
          : levelId === 'deepening'
            ? 'mastery'
            : null,

      locked:
        false,

      lockReason:
        null,

      stages: {
        theory: {
          status:
            completed
              ? 'completed'
              : 'available',

          completedAt:
            completed
              ? '2026-09-17T12:00:00.000Z'
              : null,
        },

        quiz: {
          status:
            completed
              ? 'completed'
              : 'locked',

          completedAt:
            completed
              ? '2026-09-17T12:01:00.000Z'
              : null,
        },

        practice: {
          status:
            completed
              ? 'completed'
              : 'locked',

          completedAt:
            completed
              ? '2026-09-17T12:02:00.000Z'
              : null,
        },

        checkpoint: {
          status:
            completed
              ? 'completed'
              : 'locked',

          completedAt:
            completed
              ? '2026-09-17T12:03:00.000Z'
              : null,
        },
      },

      completed,

      completedAt:
        completed
          ? '2026-09-17T12:03:00.000Z'
          : null,
    });

    it(
      'usa foundation como compatibilidad cuando el concepto no declara niveles',
      () => {
        expect(
          resolveActiveLearningLevelId(
            undefined,
            {},
          ),
        ).toBe(
          'foundation',
        );
      },
    );

    it(
      'elige el primer nivel configurado cuando todavía no hay estados',
      () => {
        expect(
          resolveActiveLearningLevelId(
            levels,
            {},
          ),
        ).toBe(
          'foundation',
        );
      },
    );

    it(
      'avanza a deepening después de completar foundation',
      () => {
        expect(
          resolveActiveLearningLevelId(
            levels,
            {
              foundation:
                levelState(
                  'foundation',
                  true,
                ),
            },
          ),
        ).toBe(
          'deepening',
        );
      },
    );

    it(
      'avanza a mastery después de completar los dos niveles anteriores',
      () => {
        expect(
          resolveActiveLearningLevelId(
            levels,
            {
              foundation:
                levelState(
                  'foundation',
                  true,
                ),

              deepening:
                levelState(
                  'deepening',
                  true,
                ),
            },
          ),
        ).toBe(
          'mastery',
        );
      },
    );

    it(
      'mantiene el último nivel configurado cuando todos están completos',
      () => {
        expect(
          resolveActiveLearningLevelId(
            levels,
            {
              foundation:
                levelState(
                  'foundation',
                  true,
                ),

              deepening:
                levelState(
                  'deepening',
                  true,
                ),

              mastery:
                levelState(
                  'mastery',
                  true,
                ),
            },
          ),
        ).toBe(
          'mastery',
        );
      },
    );

    it(
      'respeta position y no el orden recibido del array',
      () => {
        expect(
          resolveActiveLearningLevelId(
            levels,
            {
              foundation:
                levelState(
                  'foundation',
                  true,
                ),
            },
          ),
        ).toBe(
          'deepening',
        );
      },
    );
  },
);

describe(
  'concept URL gate',
  () => {
    it(
      'no trata un concepto staged desconocido o bloqueado como accesible',
      async () => {
        // LOCKED_CONCEPT_URL_GATE_REGRESSION
        const {
          canSelectRequestedConceptFromUrl,
        } = await import(
          './learning-workspace-model'
        );

        /*
         * Legacy conserva compatibilidad:
         * no depende de LearningState staged.
         */
        expect(
          canSelectRequestedConceptFromUrl(
            false,
            undefined,
          ),
        ).toBe(true);

        /*
         * En staged, estado todavía no cargado
         * debe ser fail-closed para navegación
         * solicitada desde la URL.
         */
        expect(
          canSelectRequestedConceptFromUrl(
            true,
            undefined,
          ),
        ).toBe(false);

        expect(
          canSelectRequestedConceptFromUrl(
            true,
            {
              locked:
                true,
            },
          ),
        ).toBe(false);

        expect(
          canSelectRequestedConceptFromUrl(
            true,
            {
              locked:
                false,
            },
          ),
        ).toBe(true);
      },
    );
  },
);
