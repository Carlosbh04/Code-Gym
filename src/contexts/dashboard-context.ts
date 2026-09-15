import {
  createContext,
} from 'react';

import type {
  DashboardSnapshot,
} from '@/features/dashboard/dashboard-api';

export interface DashboardContextValue {
  readonly dashboard: DashboardSnapshot | null;
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly refresh: () => Promise<void>;
  readonly resetState: () => void;
}

export const DashboardContext =
  createContext<DashboardContextValue | null>(
    null,
  );
