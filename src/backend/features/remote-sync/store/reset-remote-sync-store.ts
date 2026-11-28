import { remoteSyncState } from './remote-sync-state';
import { setAggregateStatus } from './set-aggregate-status';

export function resetRemoteSyncStore() {
  remoteSyncState.filesSyncStatus = 'IDLE';
  remoteSyncState.foldersSyncStatus = 'IDLE';
  remoteSyncState.totalFilesSynced = 0;
  remoteSyncState.totalFoldersSynced = 0;
  remoteSyncState.initialSyncReady = false;
  setAggregateStatus('IDLE');
}
