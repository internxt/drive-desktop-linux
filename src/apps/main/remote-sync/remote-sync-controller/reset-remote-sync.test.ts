vi.mock('@internxt/drive-desktop-core/build/backend');

import { createControllerState } from './create-controller-state';
import { resetRemoteSync } from './reset-remote-sync';

describe('reset-remote-sync.test', () => {
  it('should reset sync state and counters', () => {
    // Given
    const state = createControllerState();
    state.status = 'SYNC_FAILED';
    state.filesSyncStatus = 'SYNC_FAILED';
    state.foldersSyncStatus = 'SYNCED';
    state.totalFilesSynced = 4;
    state.totalFoldersSynced = 2;

    // When
    resetRemoteSync({ state });

    // Then
    expect(state).toMatchObject({
      status: 'IDLE',
      filesSyncStatus: 'IDLE',
      foldersSyncStatus: 'IDLE',
      totalFilesSynced: 0,
      totalFoldersSynced: 0,
    });
  });
});