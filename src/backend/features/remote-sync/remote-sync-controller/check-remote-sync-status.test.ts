vi.mock('@internxt/drive-desktop-core/build/backend');

import { createControllerState } from './create-controller-state';
import { checkRemoteSyncStatus } from './check-remote-sync-status';

describe('check-remote-sync-status.test', () => {
  it('should move the controller to synced when file and folder sync are synced', () => {
    // Given
    const state = createControllerState();
    state.filesSyncStatus = 'SYNCED';
    state.foldersSyncStatus = 'SYNCED';

    // When
    checkRemoteSyncStatus({
      state,
      config: {
        fetchFilesLimitPerRequest: 1,
        fetchFoldersLimitPerRequest: 1,
        syncFiles: true,
        syncFolders: true,
      },
    });

    // Then
    expect(state.status).toBe('SYNCED');
  });

  it('should keep the current state when there is no aggregated status yet', () => {
    // Given
    const state = createControllerState();
    state.status = 'SYNCING';

    // When
    checkRemoteSyncStatus({
      state,
      config: {
        fetchFilesLimitPerRequest: 1,
        fetchFoldersLimitPerRequest: 1,
        syncFiles: true,
        syncFolders: true,
      },
    });

    // Then
    expect(state.status).toBe('SYNCING');
  });
});
