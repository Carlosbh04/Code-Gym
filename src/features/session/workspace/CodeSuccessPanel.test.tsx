import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CodeSuccessPanel } from './CodeSuccessPanel';

describe('CodeSuccessPanel', () => {
  it('resume únicamente el resultado real del ejecutor', () => {
    render(<CodeSuccessPanel successEventId="session:step-4:success" result={{ pass: true, results: [
      { input: [1], expected: [2], actual: [2], pass: true },
      { input: [2], expected: [4], actual: [4], pass: true },
    ] }} />);

    expect(screen.getByRole('heading', { name: 'Código correcto' })).toBeInTheDocument();
    expect(screen.getByText('2 de 2 tests superados.')).toBeInTheDocument();
    expect(document.querySelector('[data-confetti-event="session:step-4:success"]')).toHaveAttribute('data-confetti-mode', 'code');
  });
});
