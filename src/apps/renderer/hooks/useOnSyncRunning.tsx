import { useEffect } from 'react';
import { useSyncContext } from '../context/SyncContext';

export function useOnSyncRunning(fn: () => void) {
  const { syncStatus } = useSyncContext();

  useEffect(() => {
    if (syncStatus === 'RUNNING') {
      fn();
    }
  }, [syncStatus]);
}
