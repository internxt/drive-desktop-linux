import { getRemoteSyncStoreSnapshot } from './get-remote-sync-store-snapshot';
import { remoteSyncState } from './remote-sync-state';

describe('get-remote-sync-store-snapshot', () => {
  it('should return the current remote sync fields', () => {
    remoteSyncState.status = 'SYNCED';
    remoteSyncState.filesSyncStatus = 'SYNCED';
    remoteSyncState.foldersSyncStatus = 'SYNCED';
    remoteSyncState.totalFilesSynced = 4;
    remoteSyncState.totalFoldersSynced = 2;
    remoteSyncState.initialSyncReady = true;

    expect(getRemoteSyncStoreSnapshot()).toStrictEqual({
      status: 'SYNCED',
      filesSyncStatus: 'SYNCED',
      foldersSyncStatus: 'SYNCED',
      totalFilesSynced: 4,
      totalFoldersSynced: 2,
      initialSyncReady: true,
    });
  });
});
