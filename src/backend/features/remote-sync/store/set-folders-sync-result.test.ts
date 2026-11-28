import { calls, partialSpyOn } from 'tests/vitest/utils.helper';
import * as applyDerivedAggregateStatusModule from './apply-derived-aggregate-status';
import { remoteSyncState } from './remote-sync-state';
import { setFoldersSyncResult } from './set-folders-sync-result';

describe('set-folders-sync-result', () => {
  const applyDerivedAggregateStatusMock = partialSpyOn(
    applyDerivedAggregateStatusModule,
    'applyDerivedAggregateStatus',
  );

  beforeEach(() => {
    remoteSyncState.foldersSyncStatus = 'IDLE';
    remoteSyncState.totalFoldersSynced = 1;
  });

  it('should mark folders as failed and derive the aggregate status', () => {
    setFoldersSyncResult({ error: true, totalSynced: 4 });

    expect(remoteSyncState.foldersSyncStatus).toBe('SYNC_FAILED');
    expect(remoteSyncState.totalFoldersSynced).toBe(1);
    calls(applyDerivedAggregateStatusMock).toHaveLength(1);
  });

  it('should add synced folders and derive the aggregate status', () => {
    setFoldersSyncResult({ error: false, totalSynced: 2 });

    expect(remoteSyncState.foldersSyncStatus).toBe('SYNCED');
    expect(remoteSyncState.totalFoldersSynced).toBe(3);
    calls(applyDerivedAggregateStatusMock).toHaveLength(1);
  });
});
