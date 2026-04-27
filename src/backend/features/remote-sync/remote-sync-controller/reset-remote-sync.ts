import { changeStatus } from './change-status';
import { RemoteSyncControllerState } from './types';

type ResetRemoteSyncPops = {
  state: RemoteSyncControllerState;
};

export function resetRemoteSync({ state }: ResetRemoteSyncPops) {
  changeStatus({
    state,
    newStatus: 'IDLE',
  });
  state.filesSyncStatus = 'IDLE';
  state.foldersSyncStatus = 'IDLE';
  state.totalFilesSynced = 0;
  state.totalFoldersSynced = 0;
}
