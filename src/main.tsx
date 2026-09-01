import { StrictMode, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { router } from './app/router';
import { ErrorBoundary } from '@/lib/errors/ErrorBoundary';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/700.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/500.css';
import './index.css';

const container = document.getElementById('root');

if (!container) {
  throw new Error('Root container #root no encontrado');
}

const App = ({ children }: { children: ReactNode }) => {
  return <ErrorBoundary>{children}</ErrorBoundary>;
};

createRoot(container).render(
  <StrictMode>
    <App>
      <RouterProvider router={router} />
    </App>
  </StrictMode>,
);
