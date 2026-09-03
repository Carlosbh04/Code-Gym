import { useContext } from 'react';
import { ResetProgressContext, type ResetProgressValue } from '@/contexts/reset-progress-context';

export function useResetProgress(): ResetProgressValue {
  return useContext(ResetProgressContext);
}
