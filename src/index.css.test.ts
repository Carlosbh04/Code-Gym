import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync('src/index.css', 'utf8');
const tailwindConfig = readFileSync('tailwind.config.js', 'utf8');

describe('tokens de movimiento (T071)', () => {
  it('declara una escala de duración y easing en la fuente de tokens', () => {
    expect(css).toContain('--motion-duration-fast: 150ms;');
    expect(css).toContain('--motion-duration-normal: 200ms;');
    expect(css).toContain('--motion-duration-slow: 300ms;');
    expect(css).toContain('--motion-ease-standard: cubic-bezier(0.2, 0, 0, 1);');
    expect(css).toContain('--motion-ease-emphasized: cubic-bezier(0.16, 1, 0.3, 1);');
  });

  it('expone los tokens a las utilidades de transición de Tailwind', () => {
    expect(tailwindConfig).toContain("fast: 'var(--motion-duration-fast)'");
    expect(tailwindConfig).toContain("normal: 'var(--motion-duration-normal)'");
    expect(tailwindConfig).toContain("slow: 'var(--motion-duration-slow)'");
    expect(tailwindConfig).toContain("standard: 'var(--motion-ease-standard)'");
    expect(tailwindConfig).toContain("emphasized: 'var(--motion-ease-emphasized)'");
  });

  it('define fadeInUp y el stagger con los tokens de movimiento', () => {
    expect(tailwindConfig).toContain('fadeInUp: {');
    expect(tailwindConfig).toContain("transform: 'translateY(8px)'");
    expect(tailwindConfig).toContain("transform: 'translateY(0)'");
    expect(tailwindConfig).toContain(
      "'fade-in-up':\n          'fadeInUp var(--motion-duration-normal) var(--motion-ease-standard) both'",
    );
    expect(css).toContain('.stagger-fade-in-up > *');
    expect(css).toContain(
      'animation: fadeInUp var(--motion-duration-normal) var(--motion-ease-standard) both;',
    );
    expect(css).toContain('animation-delay: var(--motion-duration-fast);');
    expect(css).toContain('animation-delay: var(--motion-duration-normal);');
    expect(css).toContain('animation-delay: var(--motion-duration-slow);');
  });
});
