import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const html = readFileSync('index.html', 'utf8');

describe('theme bootstrap', () => {
  it('resuelve y aplica el tema antes de cargar la aplicación', () => {
    const bootstrapIndex = html.indexOf("const key = 'codegym:theme'");
    const applicationIndex = html.indexOf('src="/src/main.tsx"');

    expect(bootstrapIndex).toBeGreaterThan(0);
    expect(bootstrapIndex).toBeLessThan(applicationIndex);
    expect(html).toContain("window.matchMedia?.('(prefers-color-scheme: dark)')");
    expect(html).toContain("root.classList.add(resolved)");
    expect(html).toContain('root.style.colorScheme = resolved');
  });
});
