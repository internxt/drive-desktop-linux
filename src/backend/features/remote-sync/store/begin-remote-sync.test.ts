import { call, partialSpyOn } from 'tests/vitest/utils.helper';
import { beginRemoteSync } from './begin-remote-sync';
import { remoteSyncState } from './remote-sync-state';
import * as setAggregateStatusModule from './set-aggregate-status';

describe('begin-remote-sync', () => {
  const setAggregateStatusMock = partialSpyOn(setAggregateStatusModule, 'setAggregateStatus');

  it('should reset partial sync progress and mark the sync as syncing', () => {
    remoteSyncState.totalFilesSynced = 3;
    remoteSyncState.totalFoldersSynced = 1;
    remoteSyncState.filesSyncStatus = 'SYNCED';
    remoteSyncState.foldersSyncStatus = 'SYNCED';

    beginRemoteSync({ syncFiles: true, syncFolders: false });

    expect(remoteSyncState.syncScope).toStrictEqual({ syncFiles: true, syncFolders: false });
    expect(remoteSyncState.totalFilesSynced).toBe(0);
    expect(remoteSyncState.totalFoldersSynced).toBe(0);
    expect(remoteSyncState.filesSyncStatus).toBe('IDLE');
    expect(remoteSyncState.foldersSyncStatus).toBe('IDLE');
    call(setAggregateStatusMock).toBe('SYNCING');
  });
});
