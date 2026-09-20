import {
  createContext,
} from 'react';

export interface LogoutTransitionContextValue {
  readonly active: boolean;
  runLogoutTransition(
    logoutAction: () => Promise<void>,
    onFinished?: () => void,
  ): Promise<void>;
}

export const LogoutTransitionContext =
  createContext<LogoutTransitionContextValue | null>(
    null,
  );
