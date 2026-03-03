import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { Usage } from '../../../backend/features/usage/usage.types';

interface UsageContextType {
  usage: Usage | undefined;
  status: 'loading' | 'error' | 'ready';
  refreshUsage: () => void;
}

const UsageContext = createContext<UsageContextType | undefined>(undefined);

const THROTTLE_TIME = 1000; // 1 second - allows max 1 update per second

export function UsageProvider({ children }: { children: React.ReactNode }) {
  const [usage, setUsage] = useState<Usage>();
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading');
  const throttleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isUpdatingRef = useRef<boolean>(false);
  const lastUpdateTimeRef = useRef<number>(0);

  const updateUsage = useCallback(async () => {
    // Skip if an update is already in progress
    if (isUpdatingRef.current) {
      return;
    }

    try {
      isUpdatingRef.current = true;
      lastUpdateTimeRef.current = Date.now(); // Track when we last updated
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

  // Throttled version: Updates immediately if enough time has passed,
  // otherwise schedules an update after the throttle period
  const throttledUpdateUsage = useCallback(() => {
    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdateTimeRef.current;

    // If enough time has passed, update immediately
    if (timeSinceLastUpdate >= THROTTLE_TIME) {
      updateUsage();
    } else {
      // Otherwise, schedule an update for later (if not already scheduled)
      if (!throttleTimerRef.current) {
        throttleTimerRef.current = setTimeout(() => {
          throttleTimerRef.current = null;
          updateUsage();
        }, THROTTLE_TIME - timeSinceLastUpdate);
      }
    }
  }, [updateUsage]);

  // Immediate update for manual refresh
  const refreshUsage = useCallback(() => {
    // Clear any pending throttled update
    if (throttleTimerRef.current) {
      clearTimeout(throttleTimerRef.current);
      throttleTimerRef.current = null;
    }
    updateUsage();
  }, [updateUsage]);

  useEffect(() => {
    setStatus('loading');
    updateUsage(); // Initial load

    // Listen for remote changes with throttling
    const listener = window.electron.onRemoteChanges(throttledUpdateUsage);

    return () => {
      listener();
      // Clean up timer on unmount
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
