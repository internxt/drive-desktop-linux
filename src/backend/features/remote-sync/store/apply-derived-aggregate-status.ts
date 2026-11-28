import { deriveRemoteSyncStatus } from './derive-remote-sync-status';
import { remoteSyncState } from './remote-sync-state';
import { setAggregateStatus } from './set-aggregate-status';

export function applyDerivedAggregateStatus() {
  const derived = deriveRemoteSyncStatus({
    filesSyncStatus: remoteSyncState.filesSyncStatus,
    foldersSyncStatus: remoteSyncState.foldersSyncStatus,
    syncFiles: remoteSyncState.syncScope.syncFiles,
    syncFolders: remoteSyncState.syncScope.syncFolders,
  });

  if (derived === null) return;

  setAggregateStatus(derived);
}
