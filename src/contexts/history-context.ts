import { createContext } from 'react';
import type { HistoryContextValue } from '@/types/history';

/** Historial de lectura para UI, separado de implementaciones locales (D002). */
export const HistoryContext = createContext<HistoryContextValue | null>(null);
