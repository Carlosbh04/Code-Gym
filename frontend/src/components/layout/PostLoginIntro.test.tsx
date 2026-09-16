import {
  act,
  render,
  screen,
} from '@testing-library/react';
import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import {
  PostLoginIntro,
} from './PostLoginIntro';

describe('PostLoginIntro', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('muestra la bienvenida y completa la secuencia', () => {
    vi.useFakeTimers();

    const onComplete = vi.fn();

    render(
      <PostLoginIntro
        onComplete={onComplete}
      />,
    );

    expect(
      screen.getByRole(
        'status',
        {
          name:
            'Bienvenido a CodeGym',
        },
      ),
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        /Tu espacio de entrenamiento está listo/i,
      ),
    ).toBeInTheDocument();

    expect(
      onComplete,
    ).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(4200);
    });

    expect(
      onComplete,
    ).toHaveBeenCalledTimes(1);
  });
});
