import { type ReactNode } from 'react';
import { SessionRecoveryContext } from './session-recovery-context';
import type { ISessionRecoveryStore } from '@/lib/recovery/ISessionRecoveryStore';

export interface SessionRecoveryProviderProps {
  store: ISessionRecoveryStore;
  children: ReactNode;
}

/** Provee la capacidad de recovery sin revelar Web Storage a sus consumidores. */
export function SessionRecoveryProvider({
  store,
  children,
}: SessionRecoveryProviderProps) {
  return (
    <SessionRecoveryContext.Provider value={store}>
      {children}
    </SessionRecoveryContext.Provider>
  );
}
