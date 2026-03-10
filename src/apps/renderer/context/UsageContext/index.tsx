import { createContext } from 'react';
import { UsageContextType } from './usage.types';

export const UsageContext = createContext<UsageContextType | undefined>(undefined);

export const THROTTLE_TIME = 1000;
