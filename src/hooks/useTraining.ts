import {
  useContext,
} from 'react';

import {
  TrainingContext,
  type TrainingContextValue,
} from '@/contexts/training-context';

export function useTraining():
TrainingContextValue {
  const context =
    useContext(
      TrainingContext,
    );

  if (context === null) {
    throw new Error(
      'useTraining must be used inside TrainingProvider',
    );
  }

  return context;
}
