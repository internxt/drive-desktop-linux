import { RemoteSyncControllerState } from './types';

export function createControllerState(): RemoteSyncControllerState {
  return {
    foldersSyncStatus: 'IDLE',
    filesSyncStatus: 'IDLE',
    status: 'IDLE',
    totalFilesSynced: 0,
    totalFoldersSynced: 0,
    onStatusChangeCallbacks: [],
  };
}
