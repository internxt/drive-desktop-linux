import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { SyncStatus } from '../../../context/desktop/sync/domain/SyncStatus';
import { RemoteSyncStatus } from '../../main/remote-sync/helpers';

const statusesMap: Record<RemoteSyncStatus, SyncStatus> = {
  SYNCING: 'RUNNING',
  IDLE: 'STANDBY',
  SYNCED: 'STANDBY',
  SYNC_FAILED: 'FAILED',
};

interface SyncContextValue {
  syncStatus: SyncStatus;
}

const SyncContext = createContext<SyncContextValue>({ syncStatus: 'STANDBY' });

export function SyncProvider({ children }: { readonly children: ReactNode }) {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('STANDBY');

  const setSyncStatusFromRemote = useCallback((remote: RemoteSyncStatus): void => {
    setSyncStatus(statusesMap[remote]);
  }, []);

  useEffect(() => {
    window.electron.getRemoteSyncStatus().then(setSyncStatusFromRemote);
    const removeListener = window.electron.onRemoteSyncStatusChange(setSyncStatusFromRemote);
    return removeListener;
  }, [setSyncStatusFromRemote]);

  const value = useMemo(() => ({ syncStatus }), [syncStatus]);

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSyncContext(): SyncContextValue {
  return useContext(SyncContext);
}
