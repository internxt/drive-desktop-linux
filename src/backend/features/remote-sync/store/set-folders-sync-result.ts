import { applyDerivedAggregateStatus } from './apply-derived-aggregate-status';
import { remoteSyncState } from './remote-sync-state';

type Props = {
  error: boolean;
  totalSynced: number;
};

export function setFoldersSyncResult({ error, totalSynced }: Props) {
  if (error) {
    remoteSyncState.foldersSyncStatus = 'SYNC_FAILED';
  } else {
    remoteSyncState.totalFoldersSynced += totalSynced;
    remoteSyncState.foldersSyncStatus = 'SYNCED';
  }

  applyDerivedAggregateStatus();
}
