import { describe, expect, it } from 'vitest';

import {
  conceptIdSchema,
  contentIdMaximumLength,
  contentSessionIdSchema,
  exerciseIdSchema,
  technologyIdSchema,
  topicIdSchema,
} from '../src/content/content-id.js';

const schemas = [
  ['technologyId', technologyIdSchema],
  ['topicId', topicIdSchema],
  ['conceptId', conceptIdSchema],
  ['sessionId', contentSessionIdSchema],
  ['exerciseId', exerciseIdSchema],
] as const;

describe('content id contract (T221)', () => {
  it.each([
    [technologyIdSchema, 'javascript'],
    [technologyIdSchema, 'nodejs'],
    [topicIdSchema, 'js-arrays'],
    [topicIdSchema, 'html-document'],
    [conceptIdSchema, 'js-array-iteration'],
    [conceptIdSchema, 'js-promise-flow'],
    [contentSessionIdSchema, 'js-arrays-map-vs-foreach-01'],
    [contentSessionIdSchema, 'react-components-basics-01'],
    [exerciseIdSchema, 'step-1'],
    [exerciseIdSchema, 'exercise-42'],
  ])('accepts a canonical real-world content id', (schema, value) => {
    expect(schema.parse(value)).toBe(value);
  });

  it.each(schemas)(
    '%s accepts the inclusive VARCHAR(191) persistence boundary',
    (_name, schema) => {
      const value = 'a'.repeat(contentIdMaximumLength);

      expect(value).toHaveLength(191);
      expect(schema.safeParse(value).success).toBe(true);
    },
  );

  it.each(schemas)(
    '%s rejects values beyond the persistence boundary',
    (_name, schema) => {
      const value = 'a'.repeat(contentIdMaximumLength + 1);

      expect(schema.safeParse(value).success).toBe(false);
    },
  );

  it.each([
    '',
    ' ',
    ' javascript',
    'javascript ',
    ' js-arrays ',
    'JavaScript',
    'JS-ARRAYS',
    'js-Arrays',
    'js_arrays',
    'js arrays',
    'js.arrays',
    'js/arrays',
    '../js-arrays',
    'js-arrays/../admin',
    '/js-arrays',
    'js-arrays/',
    '-js-arrays',
    'js-arrays-',
    'js--arrays',
    'js:arrays',
    'javascript:variables',
    '__proto__',
    'constructor',
    '<script>',
    'árrays',
    '数组',
    '💥',
    'js\narrays',
    'js\tarrays',
  ])('rejects a non-canonical content id: %j', (value) => {
    for (const [, schema] of schemas) {
      expect(
        schema.safeParse(value).success,
        `${value} unexpectedly passed`,
      ).toBe(false);
    }
  });

  it.each([
    null,
    undefined,
    0,
    42,
    true,
    false,
    [],
    {},
    ['javascript'],
  ])('rejects a non-string content id: %j', (value) => {
    for (const [, schema] of schemas) {
      expect(schema.safeParse(value).success).toBe(false);
    }
  });

  it('does not normalize uppercase or surrounding whitespace', () => {
    expect(
      technologyIdSchema.safeParse(' JavaScript ').success,
    ).toBe(false);

    expect(
      contentSessionIdSchema.safeParse(
        ' JS-ARRAYS-MAP-VS-FOREACH-01 ',
      ).success,
    ).toBe(false);
  });

  it('keeps each identifier kind nominally distinct at the TypeScript boundary', () => {
    const technologyId =
      technologyIdSchema.parse('javascript');

    const topicId =
      topicIdSchema.parse('js-arrays');

    const conceptId =
      conceptIdSchema.parse('js-array-iteration');

    const sessionId =
      contentSessionIdSchema.parse(
        'js-arrays-map-vs-foreach-01',
      );

    const exerciseId =
      exerciseIdSchema.parse('step-1');

    expect({
      technologyId,
      topicId,
      conceptId,
      sessionId,
      exerciseId,
    }).toEqual({
      technologyId: 'javascript',
      topicId: 'js-arrays',
      conceptId: 'js-array-iteration',
      sessionId: 'js-arrays-map-vs-foreach-01',
      exerciseId: 'step-1',
    });
  });

  it('validates syntax only and does not claim catalog existence', () => {
    /**
     * The frontend still owns the catalog in T221.
     *
     * A syntactically valid identifier may therefore pass this boundary even
     * when no current frontend content uses it. Existence validation requires
     * a catalog authority and is intentionally outside this schema.
     */
    expect(
      conceptIdSchema.safeParse(
        'js-future-valid-concept',
      ).success,
    ).toBe(true);
  });
});