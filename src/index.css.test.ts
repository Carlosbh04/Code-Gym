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

  it('define correctPulse y shake con los tokens de movimiento', () => {
    expect(tailwindConfig).toContain('correctPulse: {');
    expect(tailwindConfig).toContain("boxShadow: '0 0 0 0 var(--success-glow)'");
    expect(tailwindConfig).toContain("boxShadow: '0 0 0 8px transparent'");
    expect(tailwindConfig).toContain('shake: {');
    expect(tailwindConfig).toContain("transform: 'translateX(-4px)'");
    expect(tailwindConfig).toContain("transform: 'translateX(4px)'");
    expect(tailwindConfig).toContain(
      "'correct-pulse':\n          'correctPulse var(--motion-duration-slow) var(--motion-ease-emphasized) both'",
    );
    expect(tailwindConfig).toContain(
      "shake: 'shake var(--motion-duration-normal) var(--motion-ease-standard) both'",
    );
  });

  it('define progressFill con variables de origen y destino', () => {
    expect(tailwindConfig).toContain('progressFill: {');
    expect(tailwindConfig).toContain("from: { width: 'var(--from)' }");
    expect(tailwindConfig).toContain("to: { width: 'var(--to)' }");
    expect(tailwindConfig).toContain(
      "'progress-fill':\n          'progressFill var(--motion-duration-slow) var(--motion-ease-standard) both'",
    );
  });

  it('tokeniza las microinteracciones de controles', () => {
    expect(css).toContain(":where(button, [role='button']) {");
    expect(css).toContain('transition-property: transform, background-color, border-color, color, box-shadow;');
    expect(css).toContain('transition-duration: var(--motion-duration-fast);');
    expect(css).toContain('transition-timing-function: var(--motion-ease-standard);');
    expect(css).toContain(":where(button, [role='button']):focus-visible {");
    expect(css).toContain(":where(button, [role='button']):not(:disabled):not([aria-disabled='true']):active {");
    expect(css).toContain('transform: scale(0.98);');
  });
});
