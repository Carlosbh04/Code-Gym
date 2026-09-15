import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { HintReveal } from './HintReveal';

const revealedHints = [
  { index: 0, text: 'Revisa qué devuelve el callback' },
  { index: 1, text: 'forEach no construye nada' },
] as const;

describe('HintReveal', () => {
  it('does not render when the public hint count is zero', () => {
    const { container } = render(
      <HintReveal totalHints={0} revealedHints={[]} onReveal={() => undefined} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('never needs or renders future hint text', () => {
    render(
      <HintReveal
        totalHints={3}
        revealedHints={[revealedHints[0]]}
        onReveal={() => undefined}
      />,
    );
    expect(screen.getByText(revealedHints[0].text)).toBeInTheDocument();
    expect(screen.queryByText(revealedHints[1].text)).not.toBeInTheDocument();
    expect(screen.getByRole('button')).toHaveTextContent(
      'Ver otra pista (quedan 2)',
    );
  });

  it('renders authorized hints in their canonical order and numbers them', () => {
    render(
      <HintReveal
        totalHints={3}
        revealedHints={revealedHints}
        onReveal={() => undefined}
      />,
    );
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(within(items[0]).getByText('Pista 1 de 3')).toBeInTheDocument();
    expect(within(items[1]).getByText('Pista 2 de 3')).toBeInTheDocument();
    expect(items[0]).toHaveTextContent(revealedHints[0].text);
    expect(items[1]).toHaveTextContent(revealedHints[1].text);
  });

  it('requests exactly one next hint per activation', () => {
    const onReveal = vi.fn();
    render(
      <HintReveal totalHints={2} revealedHints={[]} onReveal={onReveal} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Ver una pista/ }));
    expect(onReveal).toHaveBeenCalledTimes(1);
  });

  it('keeps revealed hints visible and disables requests while loading', () => {
    const onReveal = vi.fn();
    render(
      <HintReveal
        totalHints={3}
        revealedHints={[revealedHints[0]]}
        onReveal={onReveal}
        isRevealing
      />,
    );
    expect(screen.getByText(revealedHints[0].text)).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('button')).toHaveTextContent('Mostrando pista…');
  });

  it('disables the control with an explicit message when exhausted', () => {
    render(
      <HintReveal
        totalHints={2}
        revealedHints={revealedHints}
        onReveal={() => undefined}
      />,
    );
    expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.getByRole('button')).toHaveAccessibleName(
      'No quedan más pistas',
    );
  });

  it('preserves the labelled live region and keyboard focus styles', () => {
    const { container } = render(
      <HintReveal totalHints={2} revealedHints={[]} onReveal={() => undefined} />,
    );
    const region = screen.getByRole('region', { name: 'Pistas' });
    expect(within(region).getByRole('list')).toHaveAttribute(
      'aria-live',
      'polite',
    );
    expect(screen.getByRole('button').className).toContain('min-h-11');
    expect(screen.getByRole('button').className).toContain(
      'focus-visible:ring-2',
    );
    expect(container).not.toHaveTextContent('future-secret-hint');
  });
});
