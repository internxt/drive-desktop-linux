import { Usage } from '../../../../backend/features/usage/usage.types';

export type UsageContextType = {
  usage: Usage | undefined;
  status: 'loading' | 'error' | 'ready';
  refreshUsage: () => void;
};
