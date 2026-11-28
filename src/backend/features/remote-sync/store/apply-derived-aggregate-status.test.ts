import { call, calls, partialSpyOn } from 'tests/vitest/utils.helper';
import * as deriveRemoteSyncStatusModule from './derive-remote-sync-status';
import * as setAggregateStatusModule from './set-aggregate-status';
import { applyDerivedAggregateStatus } from './apply-derived-aggregate-status';
import { remoteSyncState } from './remote-sync-state';

describe('apply-derived-aggregate-status', () => {
  const deriveRemoteSyncStatusMock = partialSpyOn(deriveRemoteSyncStatusModule, 'deriveRemoteSyncStatus');
  const setAggregateStatusMock = partialSpyOn(setAggregateStatusModule, 'setAggregateStatus');

  beforeEach(() => {
    remoteSyncState.filesSyncStatus = 'SYNCED';
    remoteSyncState.foldersSyncStatus = 'IDLE';
    remoteSyncState.syncScope = { syncFiles: true, syncFolders: true };
  });

  it('should set the aggregate status when derivation returns a status', () => {
    deriveRemoteSyncStatusMock.mockReturnValue('SYNCED');

    applyDerivedAggregateStatus();

    call(deriveRemoteSyncStatusMock).toStrictEqual({
      filesSyncStatus: 'SYNCED',
      foldersSyncStatus: 'IDLE',
      syncFiles: true,
      syncFolders: true,
    });
    call(setAggregateStatusMock).toBe('SYNCED');
  });

  it('should skip the aggregate update when derivation returns null', () => {
    deriveRemoteSyncStatusMock.mockReturnValue(null);

    applyDerivedAggregateStatus();

    calls(setAggregateStatusMock).toHaveLength(0);
  });
});
