import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TechnologyIcon } from './TechnologyIcon';

describe('TechnologyIcon', () => {
  it('renderiza el PNG real cuando el id está mapeado', () => {
    const { container } = render(
      <TechnologyIcon technologyId="javascript" technologyName="JavaScript" />,
    );

    expect(container.querySelector('img')).toHaveAttribute('src', expect.stringMatching(/javascript\.png$/));
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
    expect(container.firstElementChild).toHaveAttribute('data-technology-icon-source', 'asset');
  });

  it('mantiene el identificador textual para tecnologías no mapeadas', () => {
    render(
      <TechnologyIcon technologyId="python" technologyName="Python" fallback="py" />,
    );

    expect(screen.getByText('py')).toBeInTheDocument();
    expect(document.querySelector('img')).toBeNull();
    expect(screen.getByText('py')).toHaveAttribute('data-technology-icon-source', 'fallback');
  });
});
