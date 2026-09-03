import { createContext } from 'react';

export interface ResetProgressValue { resetProgress: () => Promise<void>; }
export const ResetProgressContext = createContext<ResetProgressValue>({
  resetProgress: async () => { throw new Error('Reset Progress no está disponible'); },
});
