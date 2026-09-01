import { Component, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary, type ErrorBoundaryFallbackProps } from './ErrorBoundary';

class Boom extends Component {
  render(): ReactNode {
    throw new Error('fallo de render');
  }
}

class ConditionalBoom extends Component<{ shouldThrow: boolean }> {
  render(): ReactNode {
    if (this.props.shouldThrow) {
      throw new Error('fallo condicional');
    }
    return <div data-testid="recovered">OK</div>;
  }
}

describe('ErrorBoundary (T015)', () => {
  it('captura un error de renderizado y muestra el fallback', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.getByText('Algo salió mal')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
    consoleError.mockRestore();
  });

  it('renderiza los hijos sin errores cuando no hay error', () => {
    render(
      <ErrorBoundary>
        <div data-testid="ok">contenido</div>
      </ErrorBoundary>,
    );
    expect(screen.getByTestId('ok')).toHaveTextContent('contenido');
  });

  it('ejecuta onReset cuando se presiona Reintentar', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const onReset = vi.fn();
    render(
      <ErrorBoundary onReset={onReset}>
        <Boom />
      </ErrorBoundary>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(onReset).toHaveBeenCalledOnce();
    consoleError.mockRestore();
  });

  it('permite recuperar cuando el error es transitorio', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { rerender } = render(
      <ErrorBoundary>
        <ConditionalBoom shouldThrow />
      </ErrorBoundary>,
    );
    expect(screen.getByText('Algo salió mal')).toBeInTheDocument();

    rerender(
      <ErrorBoundary>
        <ConditionalBoom shouldThrow={false} />
      </ErrorBoundary>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(screen.getByTestId('recovered')).toHaveTextContent('OK');
    consoleError.mockRestore();
  });

  it('renderiza fallback personalizado cuando se proporciona', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const customFallback = ({ error, reset }: ErrorBoundaryFallbackProps) => (
      <div data-testid="custom">
        <span>{error.message}</span>
        <button type="button" onClick={reset}>
         custom reset
        </button>
      </div>
    );
    render(
      <ErrorBoundary fallback={customFallback}>
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.getByTestId('custom')).toBeInTheDocument();
    expect(screen.getByText('fallo de render')).toBeInTheDocument();
    consoleError.mockRestore();
  });
});