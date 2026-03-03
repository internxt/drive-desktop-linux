import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { Usage } from '../../../backend/features/usage/usage.types';

interface UsageContextType {
  usage: Usage | undefined;
  status: 'loading' | 'error' | 'ready';
  refreshUsage: () => void;
}

const UsageContext = createContext<UsageContextType | undefined>(undefined);

const THROTTLE_TIME = 1000;

export function UsageProvider({ children }: { children: React.ReactNode }) {
  const [usage, setUsage] = useState<Usage>();
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading');
  const throttleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isUpdatingRef = useRef<boolean>(false);
  const lastUpdateTimeRef = useRef<number>(0);

  const updateUsage = useCallback(async () => {
    if (isUpdatingRef.current) {
      return;
    }

    try {
      isUpdatingRef.current = true;
      lastUpdateTimeRef.current = Date.now();
      const userIsLoggedIn = await window.electron.isUserLoggedIn();

      if (!userIsLoggedIn) {
        isUpdatingRef.current = false;
        return;
      }

      const getUsageResult = await window.electron.getUsage();

      if (getUsageResult.data) {
        setUsage(getUsageResult.data);
        setStatus('ready');
      } else {
        setStatus('error');
      }
    } catch (err) {
      window.electron.logger.error({
        msg: 'Error getting usage in UsageContext',
        error: err,
      });
      setStatus('error');
    } finally {
      isUpdatingRef.current = false;
    }
  }, []);

  const throttledUpdateUsage = useCallback(() => {
    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdateTimeRef.current;

    if (timeSinceLastUpdate >= THROTTLE_TIME) {
      updateUsage();
    } else {
      if (!throttleTimerRef.current) {
        throttleTimerRef.current = setTimeout(() => {
          throttleTimerRef.current = null;
          updateUsage();
        }, THROTTLE_TIME - timeSinceLastUpdate);
      }
    }
  }, [updateUsage]);

  const refreshUsage = useCallback(() => {
    if (throttleTimerRef.current) {
      clearTimeout(throttleTimerRef.current);
      throttleTimerRef.current = null;
    }
    updateUsage();
  }, [updateUsage]);

  useEffect(() => {
    setStatus('loading');
    updateUsage();

    const listener = window.electron.onRemoteChanges(throttledUpdateUsage);

    return () => {
      listener();
      if (throttleTimerRef.current) {
        clearTimeout(throttleTimerRef.current);
      }
    };
  }, [updateUsage, throttledUpdateUsage]);

  return <UsageContext.Provider value={{ usage, status, refreshUsage }}>{children}</UsageContext.Provider>;
}

export function useUsage() {
  const context = useContext(UsageContext);
  if (context === undefined) {
    throw new Error('useUsage must be used within a UsageProvider');
  }
  return context;
}
