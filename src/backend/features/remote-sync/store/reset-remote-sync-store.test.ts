import { call, partialSpyOn } from 'tests/vitest/utils.helper';
import { remoteSyncState } from './remote-sync-state';
import { resetRemoteSyncStore } from './reset-remote-sync-store';
import * as setAggregateStatusModule from './set-aggregate-status';

describe('reset-remote-sync-store', () => {
  const setAggregateStatusMock = partialSpyOn(setAggregateStatusModule, 'setAggregateStatus');

  it('should clear sync fields and set the aggregate status to idle', () => {
    remoteSyncState.filesSyncStatus = 'SYNCED';
    remoteSyncState.foldersSyncStatus = 'SYNC_FAILED';
    remoteSyncState.totalFilesSynced = 2;
    remoteSyncState.totalFoldersSynced = 1;
    remoteSyncState.initialSyncReady = true;

    resetRemoteSyncStore();

    expect(remoteSyncState.filesSyncStatus).toBe('IDLE');
    expect(remoteSyncState.foldersSyncStatus).toBe('IDLE');
    expect(remoteSyncState.totalFilesSynced).toBe(0);
    expect(remoteSyncState.totalFoldersSynced).toBe(0);
    expect(remoteSyncState.initialSyncReady).toBe(false);
    call(setAggregateStatusMock).toBe('IDLE');
  });
});
