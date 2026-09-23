import {
  readFile,
  readdir,
} from 'node:fs/promises';
import {
  join,
  sep,
} from 'node:path';

import {
  describe,
  expect,
  it,
} from 'vitest';

interface StaticSession {
  readonly id: string;
  readonly kind?: string;
  readonly passingPercentage?: number | null;
}

const CONTENT_ROOT =
  join(
    process.cwd(),
    '..',
    'frontend',
    'src',
    'data',
    'content',
  );

async function collectJsonPaths(
  directory: string,
): Promise<readonly string[]> {
  const entries =
    await readdir(
      directory,
      {
        withFileTypes:
          true,
      },
    );

  const nestedPaths =
    await Promise.all(
      entries.map(
        async entry => {
          const path =
            join(
              directory,
              entry.name,
            );

          if (
            entry.isDirectory()
          ) {
            return collectJsonPaths(
              path,
            );
          }

          return entry.isFile()
            && entry.name.endsWith(
              '.json',
            )
            ? [
                path,
              ]
            : [];
        },
      ),
    );

  return nestedPaths.flat();
}

describe(
  'static catalog session contract',
  () => {
    it(
      'uses passingPercentage only for quizzes',
      async () => {
        const paths =
          await collectJsonPaths(
            CONTENT_ROOT,
          );

        const violations:
          string[] = [];

        for (
          const path
          of paths
        ) {
          if (
            !path.includes(
              `${sep}sessions${sep}`,
            )
          ) {
            continue;
          }

          const parsed =
            JSON.parse(
              await readFile(
                path,
                'utf8',
              ),
            ) as Partial<StaticSession>;

          if (
            typeof parsed.id
              !== 'string'
          ) {
            continue;
          }

          const kind =
            parsed.kind
            ?? 'practice';

          const passingPercentage =
            parsed.passingPercentage
            ?? null;

          if (
            kind === 'quiz'
          ) {
            if (
              !Number.isInteger(
                passingPercentage,
              )
              || passingPercentage === null
              || passingPercentage < 0
              || passingPercentage > 100
            ) {
              violations.push(
                `${parsed.id}: quiz requires an integer passingPercentage between 0 and 100`,
              );
            }

            continue;
          }

          if (
            passingPercentage !== null
          ) {
            violations.push(
              `${parsed.id}: ${kind} must not define a numeric passingPercentage`,
            );
          }
        }

        expect(
          violations,
        ).toEqual(
          [],
        );
      },
    );
  },
);
