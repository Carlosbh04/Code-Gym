import type {
  ReactNode,
} from 'react';

import {
  AuthProvider,
} from '@/features/auth/AuthContext';
import {
  SessionIdleProvider,
} from '@/features/session-idle/SessionIdleContext';
import {
  LogoutTransitionProvider,
} from '@/features/logout-transition/LogoutTransitionContext';

import {
  TrainingProvider,
} from '@/contexts/TrainingContext';

import {
  DashboardProvider,
} from '@/contexts/DashboardContext';

import {
  ContentProvider,
} from '@/contexts/ContentContext';

import {
  HistoryProvider,
} from '@/contexts/HistoryContext';

import {
  ProgressProvider,
} from '@/contexts/ProgressContext';

import {
  SessionRecoveryProvider,
} from '@/contexts/SessionRecoveryContext';

import {
  ThemeProvider,
} from '@/contexts/ThemeContext';

import {
  ApiContentRepository,
} from '@/lib/repositories/ApiContentRepository';

import {
  SessionStorageRecoveryStore,
} from '@/lib/recovery/SessionStorageRecoveryStore';

const contentRepository =
  new ApiContentRepository();

const sessionRecoveryStore =
  new SessionStorageRecoveryStore();

export function AppProviders({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <AuthProvider>
      <LogoutTransitionProvider>
        <SessionIdleProvider>
        <DashboardProvider>
        <TrainingProvider>
          <ThemeProvider>
            <ProgressProvider>
              <HistoryProvider>
                <SessionRecoveryProvider
                  store={
                    sessionRecoveryStore
                  }
                >
                  <ContentProvider
                    repository={
                      contentRepository
                    }
                  >
                    {children}
                  </ContentProvider>
                </SessionRecoveryProvider>
              </HistoryProvider>
            </ProgressProvider>
          </ThemeProvider>
        </TrainingProvider>
        </DashboardProvider>
        </SessionIdleProvider>
      </LogoutTransitionProvider>
    </AuthProvider>
  );
}
