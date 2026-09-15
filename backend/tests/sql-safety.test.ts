import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

function handwrittenTypeScriptFiles(directory: string): readonly string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      return entry.name === 'generated' ? [] : handwrittenTypeScriptFiles(path);
    }

    return entry.isFile() && entry.name.endsWith('.ts') ? [path] : [];
  });
}

describe('raw SQL policy', () => {
  it('contains no references to Prisma unsafe raw APIs in handwritten source', () => {
    const forbiddenApis = ['$queryRawUnsafe', '$executeRawUnsafe'] as const;

    for (const path of handwrittenTypeScriptFiles('src')) {
      const source = readFileSync(path, 'utf8');
      for (const api of forbiddenApis) {
        expect(source, `${api} is prohibited in ${path}`).not.toContain(api);
      }
    }
  });
});
