import {
  describe,
  expect,
  it,
} from 'vitest';

import type {
  LearningLevel,
} from '@/types/content';

import {
  getConfiguredLearningLevelIds,
  isStagedLearningConcept,
} from './learning-workspace-model';

const configuredLevels:
  readonly LearningLevel[] = [
    {
      id:
        'mastery',
      name:
        'Dominio',
      description:
        'Aplicación avanzada del concepto.',
      position:
        2,
    },
    {
      id:
        'foundation',
      name:
        'Fundamentos',
      description:
        'Bases esenciales del concepto.',
      position:
        0,
    },
    {
      id:
        'deepening',
      name:
        'Profundización',
      description:
        'Comprensión intermedia del concepto.',
      position:
        1,
    },
  ];

describe(
  'learning concept staging contract',
  () => {
    it(
      'treats a concept without configured levels as legacy',
      () => {
        expect(
          isStagedLearningConcept(
            {},
          ),
        ).toBe(
          false,
        );

        expect(
          getConfiguredLearningLevelIds(
            {},
          ),
        ).toEqual([
          'foundation',
        ]);
      },
    );

    it(
      'does not consider an empty levels array staged',
      () => {
        expect(
          isStagedLearningConcept({
            levels: [],
          }),
        ).toBe(
          false,
        );

        expect(
          getConfiguredLearningLevelIds({
            levels: [],
          }),
        ).toEqual([
          'foundation',
        ]);
      },
    );

    it(
      'uses configured levels as the source of truth for staged concepts',
      () => {
        expect(
          isStagedLearningConcept({
            levels:
              configuredLevels,
          }),
        ).toBe(
          true,
        );
      },
    );

    it(
      'returns configured levels in canonical position order',
      () => {
        expect(
          getConfiguredLearningLevelIds({
            levels:
              configuredLevels,
          }),
        ).toEqual([
          'foundation',
          'deepening',
          'mastery',
        ]);
      },
    );

    it(
      'does not mutate the original level configuration',
      () => {
        const original =
          configuredLevels.map(
            level =>
              level.id,
          );

        getConfiguredLearningLevelIds({
          levels:
            configuredLevels,
        });

        expect(
          configuredLevels.map(
            level =>
              level.id,
          ),
        ).toEqual(
          original,
        );
      },
    );
  },
);
