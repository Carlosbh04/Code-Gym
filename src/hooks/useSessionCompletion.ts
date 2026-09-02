import { useContext } from 'react';
import {
  SessionCompletionContext,
  type SessionCompletionContextValue,
} from '@/contexts/session-completion-context';

/** Acceso interno de la sesión al coordinador de persistencia (T050, D018). */
export function useSessionCompletion(): SessionCompletionContextValue {
  const value = useContext(SessionCompletionContext);

  if (value === null) {
    throw new Error(
      'useSessionCompletion debe usarse dentro de <SessionCompletionProvider>',
    );
  }

  return value;
}
