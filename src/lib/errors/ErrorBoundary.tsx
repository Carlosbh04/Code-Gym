import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

export interface ErrorBoundaryFallbackProps {
  error: Error;
  reset: () => void;
}

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (props: ErrorBoundaryFallbackProps) => ReactNode;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('CodeGym render error capturado:', error, info);
  }

  private handleReset = () => {
    this.setState({ error: null });
    this.props.onReset?.();
  };

  render() {
    const { error } = this.state;
    if (!error) {
      return this.props.children;
    }

    const fallback = this.props.fallback ?? DefaultErrorFallback;
    return fallback({ error, reset: this.handleReset });
  }
}

const messages: Record<string, string> = {
  default: 'Ha ocurrido un error inesperado al renderizar la interfaz.',
};

function DefaultErrorFallback({ error, reset }: ErrorBoundaryFallbackProps) {
  return (
    <div
      role="alert"
      className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-4 py-12 text-center"
    >
      <div
        aria-hidden="true"
        className="flex size-16 items-center justify-center rounded-full bg-[var(--bg-tertiary)] text-[var(--warning)]"
      >
        <AlertTriangle className="size-8" />
      </div>

      <div className="space-y-2">
        <h1 className="text-lg font-semibold text-[var(--text-primary)]">
          Algo salió mal
        </h1>
        <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
          {messages.default}
        </p>
      </div>

      <p className="sr-only" data-testid="error-boundary-message">
        {error.message ?? messages.default}
      </p>

      <button
        type="button"
        onClick={reset}
        className="mt-2 inline-flex min-h-[44px] items-center justify-center rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
      >
        Reintentar
      </button>
    </div>
  );
}