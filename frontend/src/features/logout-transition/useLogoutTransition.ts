import {
  useContext,
} from 'react';

import {
  LogoutTransitionContext,
  type LogoutTransitionContextValue,
} from './logout-transition-context';

export function useLogoutTransition():
LogoutTransitionContextValue {
  const context =
    useContext(LogoutTransitionContext);

  if (context === null) {
    throw new Error(
      'useLogoutTransition must be used within LogoutTransitionProvider',
    );
  }

  return context;
}
