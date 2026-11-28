import { remoteSyncState } from './remote-sync-state';

export function getRemoteSyncStoreSnapshot() {
  return {
    status: remoteSyncState.status,
    filesSyncStatus: remoteSyncState.filesSyncStatus,
    foldersSyncStatus: remoteSyncState.foldersSyncStatus,
    totalFilesSynced: remoteSyncState.totalFilesSynced,
    totalFoldersSynced: remoteSyncState.totalFoldersSynced,
    initialSyncReady: remoteSyncState.initialSyncReady,
  };
}
