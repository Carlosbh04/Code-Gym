import {
  act,
  fireEvent,
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

import { PageLoadTransition } from './PageLoadTransition';

afterEach(() => {
  vi.useRealTimers();
});

describe('PageLoadTransition', () => {
  it('mantiene el skeleton mientras existe carga real', () => {
    render(
      <PageLoadTransition
        loading
        presentationKey="real-loading"
        skeleton={<p>Cargando</p>}
      >
        <p>Contenido</p>
      </PageLoadTransition>,
    );

    expect(
      screen.getByText('Cargando'),
    ).toBeInTheDocument();

    expect(
      screen.queryByText('Contenido'),
    ).not.toBeInTheDocument();
  });

  it('muestra el skeleton en la primera visita aunque los datos ya estén disponibles', () => {
    vi.useFakeTimers();

    render(
      <PageLoadTransition
        loading={false}
        presentationKey="first-fast-load"
        skeleton={<p>Cargando</p>}
      >
        <p>Contenido</p>
      </PageLoadTransition>,
    );

    expect(
      screen.getByText('Cargando'),
    ).toBeInTheDocument();

    expect(
      screen.queryByText('Contenido'),
    ).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(649);
    });

    expect(
      screen.getByTestId(
        'page-load-skeleton',
      ),
    ).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1);
    });

    const skeleton =
      screen.getByTestId(
        'page-load-skeleton',
      );

    expect(skeleton.parentElement)
      .toHaveAttribute(
        'data-phase',
        'exiting',
      );

    fireEvent.animationEnd(skeleton);

    expect(
      screen.getByText('Contenido'),
    ).toBeInTheDocument();
  });

  it('no fuerza el skeleton al volver a una sección ya presentada', () => {
    vi.useFakeTimers();

    const first = render(
      <PageLoadTransition
        loading={false}
        presentationKey="cached-section"
        skeleton={<p>Cargando</p>}
      >
        <p>Contenido</p>
      </PageLoadTransition>,
    );

    act(() => {
      vi.advanceTimersByTime(650);
    });

    fireEvent.animationEnd(
      screen.getByTestId(
        'page-load-skeleton',
      ),
    );

    first.unmount();

    render(
      <PageLoadTransition
        loading={false}
        presentationKey="cached-section"
        skeleton={<p>Cargando</p>}
      >
        <p>Contenido</p>
      </PageLoadTransition>,
    );

    expect(
      screen.queryByText('Cargando'),
    ).not.toBeInTheDocument();

    expect(
      screen.getByText('Contenido'),
    ).toBeInTheDocument();

    expect(
      screen.getByTestId(
        'page-load-content',
      ).parentElement,
    ).toHaveAttribute(
      'data-phase',
      'entering',
    );
  });

  it('espera a la carga real aunque ya haya superado el mínimo visual', () => {
    vi.useFakeTimers();

    const { rerender } = render(
      <PageLoadTransition
        loading
        presentationKey="slow-real-load"
        skeleton={<p>Cargando</p>}
      >
        <p>Contenido</p>
      </PageLoadTransition>,
    );

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(
      screen.getByText('Cargando'),
    ).toBeInTheDocument();

    rerender(
      <PageLoadTransition
        loading={false}
        presentationKey="slow-real-load"
        skeleton={<p>Cargando</p>}
      >
        <p>Contenido</p>
      </PageLoadTransition>,
    );

    act(() => {
      vi.advanceTimersByTime(0);
    });

    expect(
      screen.getByTestId(
        'page-load-skeleton',
      ).parentElement,
    ).toHaveAttribute(
      'data-phase',
      'exiting',
    );
  });

  it('termina en estado ready al finalizar la entrada', () => {
    vi.useFakeTimers();

    render(
      <PageLoadTransition
        loading={false}
        presentationKey="ready-state"
        skeleton={<p>Cargando</p>}
      >
        <p>Contenido</p>
      </PageLoadTransition>,
    );

    act(() => {
      vi.advanceTimersByTime(650);
    });

    fireEvent.animationEnd(
      screen.getByTestId(
        'page-load-skeleton',
      ),
    );

    const content =
      screen.getByTestId(
        'page-load-content',
      );

    fireEvent.animationEnd(content);

    expect(content.parentElement)
      .toHaveAttribute(
        'data-phase',
        'ready',
      );
  });

  it('vuelve al skeleton si comienza una nueva carga real', () => {
    vi.useFakeTimers();

    const first = render(
      <PageLoadTransition
        loading={false}
        presentationKey="reload-section"
        skeleton={<p>Cargando</p>}
      >
        <p>Contenido</p>
      </PageLoadTransition>,
    );

    act(() => {
      vi.advanceTimersByTime(650);
    });

    fireEvent.animationEnd(
      screen.getByTestId(
        'page-load-skeleton',
      ),
    );

    fireEvent.animationEnd(
      screen.getByTestId(
        'page-load-content',
      ),
    );

    first.rerender(
      <PageLoadTransition
        loading
        presentationKey="reload-section"
        skeleton={<p>Cargando</p>}
      >
        <p>Contenido</p>
      </PageLoadTransition>,
    );

    expect(
      screen.getByText('Cargando'),
    ).toBeInTheDocument();

    expect(
      screen.queryByText('Contenido'),
    ).not.toBeInTheDocument();
  });
});
