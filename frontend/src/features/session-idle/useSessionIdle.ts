import {
  useContext,
} from 'react';

import {
  SessionIdleContext,
  type SessionIdleContextValue,
} from './session-idle-context';

export function useSessionIdle():
SessionIdleContextValue {
  const context =
    useContext(
      SessionIdleContext,
    );

  if (context === null) {
    throw new Error(
      'useSessionIdle must be used within SessionIdleProvider',
    );
  }

  return context;
}
