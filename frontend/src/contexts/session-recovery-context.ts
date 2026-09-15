import { createContext } from 'react';
import type { ISessionRecoveryStore } from '@/lib/recovery/ISessionRecoveryStore';

/** Canal inyectable entre la composición y la sesión activa (T052, D019). */
export const SessionRecoveryContext =
  createContext<ISessionRecoveryStore | null>(null);
