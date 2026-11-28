import type { RemoteSyncScope } from './remote-sync-state';
import { remoteSyncState } from './remote-sync-state';
import { setAggregateStatus } from './set-aggregate-status';

type Props = RemoteSyncScope;

export function beginRemoteSync({ syncFiles, syncFolders }: Props) {
  remoteSyncState.syncScope = { syncFiles, syncFolders };
  remoteSyncState.totalFilesSynced = 0;
  remoteSyncState.totalFoldersSynced = 0;
  remoteSyncState.filesSyncStatus = 'IDLE';
  remoteSyncState.foldersSyncStatus = 'IDLE';
  setAggregateStatus('SYNCING');
}
