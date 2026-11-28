import { calls, partialSpyOn } from 'tests/vitest/utils.helper';
import * as applyDerivedAggregateStatusModule from './apply-derived-aggregate-status';
import { remoteSyncState } from './remote-sync-state';
import { setFilesSyncResult } from './set-files-sync-result';

describe('set-files-sync-result', () => {
  const applyDerivedAggregateStatusMock = partialSpyOn(
    applyDerivedAggregateStatusModule,
    'applyDerivedAggregateStatus',
  );

  beforeEach(() => {
    remoteSyncState.filesSyncStatus = 'IDLE';
    remoteSyncState.totalFilesSynced = 1;
  });

  it('should mark files as failed and derive the aggregate status', () => {
    setFilesSyncResult({ error: true, totalSynced: 4 });

    expect(remoteSyncState.filesSyncStatus).toBe('SYNC_FAILED');
    expect(remoteSyncState.totalFilesSynced).toBe(1);
    calls(applyDerivedAggregateStatusMock).toHaveLength(1);
  });

  it('should add synced files and derive the aggregate status', () => {
    setFilesSyncResult({ error: false, totalSynced: 5 });

    expect(remoteSyncState.filesSyncStatus).toBe('SYNCED');
    expect(remoteSyncState.totalFilesSynced).toBe(6);
    calls(applyDerivedAggregateStatusMock).toHaveLength(1);
  });
});
