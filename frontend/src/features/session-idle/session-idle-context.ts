import {
  createContext,
} from 'react';

export interface SessionIdleContextValue {
  readonly warningOpen: boolean;
  readonly secondsRemaining: number;
  readonly continuePending: boolean;

  continueSession(): Promise<void>;
  closeSession(): Promise<void>;
}

export const SessionIdleContext =
  createContext<SessionIdleContextValue | null>(
    null,
  );
