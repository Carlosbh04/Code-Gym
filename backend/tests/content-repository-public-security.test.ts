import {
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import type {
  PrismaClient,
} from '../src/generated/prisma/client.js';

import {
  PrismaContentRepository,
} from '../src/content/content-repository.js';

describe('PrismaContentRepository public DTO security', () => {
  it('exposes only fix-code requirements and never canonical test data', async () => {
    const findFirst =
      vi.fn()
        .mockResolvedValue({
          id: 'session-1',
          conceptId: 'concept-1',
          technologyId: 'javascript',
          title: 'Doblar números',
          difficulty: 'BEGINNER',
          version: '1.0.0',
          status: 'PUBLISHED',
          position: 0,
          createdAt:
            new Date(
              '2026-09-15T10:00:00.000Z',
            ),
          updatedAt:
            new Date(
              '2026-09-15T10:00:00.000Z',
            ),
          steps: [
            {
              id: 'step-1',
              sessionId: 'session-1',
              type: 'FIX_CODE',
              prompt:
                'Corrige la función.',
              code:
                'function dobles(input) { return input; }',
              language: 'javascript',
              options: null,
              errorLines: [2],
              errorType: 'REFERENCE_ERROR_PRIVATE',
              testCases: [
                {
                  input: [1, 2],
                  expected: [2, 4],
                  call:
                    'dobles(input)',
                  description:
                    'duplica números',
                },
                {
                  input: [],
                  expected: [],
                  call:
                    'dobles(input)',
                  description:
                    'conserva un array vacío',
                },
              ],
              expectedPatterns: [
                'PRIVATE_EXPECTED_PATTERN_DO_NOT_EXPOSE',
              ],
              explanation:
                'map devuelve un nuevo array.',
              hints: [
                'PRIVATE_HINT_ONE_DO_NOT_EXPOSE',
                'PRIVATE_HINT_TWO_DO_NOT_EXPOSE',
              ],
              position: 1,
              createdAt:
                new Date(
                  '2026-09-15T10:00:00.000Z',
                ),
              updatedAt:
                new Date(
                  '2026-09-15T10:00:00.000Z',
                ),
            },
          ],
        });

    const prisma = {
      exerciseSession: {
        findFirst,
      },
    } as unknown as PrismaClient;

    const repository =
      new PrismaContentRepository(
        prisma,
      );

    const session =
      await repository.getSessionById(
        'session-1',
      );

    expect(session).not.toBeNull();

    const serialized =
      JSON.stringify(session);

    expect(serialized)
      .toContain(
        '"requirements":["duplica números","conserva un array vacío"]',
      );

    expect(serialized)
      .toContain('"hintCount":2');

    expect(serialized)
      .not.toContain('"hints"');

    expect(serialized)
      .not.toContain('PRIVATE_HINT_ONE_DO_NOT_EXPOSE');

    expect(serialized)
      .not.toContain('PRIVATE_HINT_TWO_DO_NOT_EXPOSE');

    expect(serialized)
      .not.toContain('"explanation"');

    expect(serialized)
      .not.toContain('map devuelve un nuevo array.');

    expect(serialized)
      .not.toContain('"correct"');

    expect(serialized)
      .not.toContain('"correctOptionIds"');

    expect(serialized)
      .not.toContain('"errorLines"');

    expect(serialized)
      .not.toContain('"errorType"');

    expect(serialized)
      .not.toContain('REFERENCE_ERROR_PRIVATE');

    expect(serialized)
      .not.toContain('"expectedPatterns"');

    expect(serialized)
      .not.toContain(
        'PRIVATE_EXPECTED_PATTERN_DO_NOT_EXPOSE',
      );

    expect(serialized)
      .not.toContain('"testCases"');

    expect(serialized)
      .not.toContain('"input"');

    expect(serialized)
      .not.toContain('"expected"');

    expect(serialized)
      .not.toContain('"call"');

    expect(findFirst)
      .toHaveBeenCalledOnce();
  });
});
