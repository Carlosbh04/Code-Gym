import {
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import {
  PrismaContentRepository,
} from '../src/content/content-repository.js';

describe(
  'canonical training metadata progression mode',
  () => {
    it(
      'keeps legacy practice compatible when concept has no required quiz',
      async () => {
        const exerciseSession = {
          findFirst:
            vi.fn()
              .mockResolvedValueOnce({
                id:
                  'legacy-practice',

                conceptId:
                  'js-array-iteration',

                technologyId:
                  'javascript',

                kind:
                  'PRACTICE',

                passingPercentage:
                  null,

                requiredForProgression:
                  true,

                status:
                  'PUBLISHED',
              })
              .mockResolvedValueOnce(
                null,
              ),
        };

        const repository =
          new PrismaContentRepository(
            {
              exerciseSession,
            } as never,
          );

        const result =
          await repository
            .getCanonicalTrainingSessionMetadata(
              'legacy-practice',
            );

        expect(
          result?.progressionEnabled,
        ).toBe(
          false,
        );
      },
    );

    it(
      'enables staged progression when a required published quiz exists',
      async () => {
        const exerciseSession = {
          findFirst:
            vi.fn()
              .mockResolvedValueOnce({
                id:
                  'practice-1',

                conceptId:
                  'js-array-basics',

                technologyId:
                  'javascript',

                kind:
                  'PRACTICE',

                passingPercentage:
                  null,

                requiredForProgression:
                  true,

                status:
                  'PUBLISHED',
              })
              .mockResolvedValueOnce({
                id:
                  'quiz-1',
              }),
        };

        const repository =
          new PrismaContentRepository(
            {
              exerciseSession,
            } as never,
          );

        const result =
          await repository
            .getCanonicalTrainingSessionMetadata(
              'practice-1',
            );

        expect(
          result?.progressionEnabled,
        ).toBe(
          true,
        );
      },
    );
  },
);
