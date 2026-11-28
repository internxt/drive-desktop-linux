import { applyDerivedAggregateStatus } from './apply-derived-aggregate-status';
import { remoteSyncState } from './remote-sync-state';

type Props = {
  error: boolean;
  totalSynced: number;
};

export function setFilesSyncResult({ error, totalSynced }: Props) {
  if (error) {
    remoteSyncState.filesSyncStatus = 'SYNC_FAILED';
  } else {
    remoteSyncState.totalFilesSynced += totalSynced;
    remoteSyncState.filesSyncStatus = 'SYNCED';
  }

  applyDerivedAggregateStatus();
}
