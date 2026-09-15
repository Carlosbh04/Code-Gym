import {
  useContext,
} from 'react';

import {
  DashboardContext,
  type DashboardContextValue,
} from '@/contexts/dashboard-context';

export function useDashboard():
  DashboardContextValue {
  const context =
    useContext(
      DashboardContext,
    );

  if (context === null) {
    throw new Error(
      'useDashboard debe usarse dentro de DashboardProvider',
    );
  }

  return context;
}
