import { createControllerState } from './create-controller-state';

describe('create-controller-state.test', () => {
  it('should create the initial controller state', () => {
    // When
    const result = createControllerState();

    // Then
    expect(result).toStrictEqual({
      foldersSyncStatus: 'IDLE',
      filesSyncStatus: 'IDLE',
      status: 'IDLE',
      totalFilesSynced: 0,
      totalFoldersSynced: 0,
      onStatusChangeCallbacks: [],
    });
  });
});