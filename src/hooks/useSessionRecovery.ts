import { useContext } from 'react';
import { SessionRecoveryContext } from '@/contexts/session-recovery-context';
import type { ISessionRecoveryStore } from '@/lib/recovery/ISessionRecoveryStore';

export function useSessionRecoveryStore(): ISessionRecoveryStore {
  const value = useContext(SessionRecoveryContext);

  if (value === null) {
    throw new Error(
      'useSessionRecoveryStore debe usarse dentro de <SessionRecoveryProvider>',
    );
  }

  return value;
}
