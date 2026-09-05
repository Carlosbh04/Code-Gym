import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { cn } from '@/lib/utils';

function Pill({ label }: { label: string }) {
  return <span data-testid="pill">{label}</span>;
}

describe('configuracion de testing (T008)', () => {
  it('jsdom + RTL renderizan y hacen cleanup', () => {
    render(<Pill label="ok" />);
    expect(screen.getByTestId('pill')).toHaveTextContent('ok');
  });

  it('resuelve el alias @/ y matchers de jest-dom', () => {
    expect(cn('a', 'b')).toBe('a b');
    document.body.innerHTML =
      '<div data-testid="node"><span class="x">texto</span></div>';
    expect(screen.getByTestId('node')).toBeInTheDocument();
  });

  it('proporciona las mediciones vacías que necesita CodeMirror en jsdom', () => {
    const range = document.createRange();

    expect(range.getClientRects()).toHaveLength(0);
    expect(range.getBoundingClientRect()).toBeInstanceOf(DOMRect);
  });
});
