import { resolveRemoteSyncStatus } from '../resolve-remote-sync-status';
import { changeStatus } from './change-status';
import { RemoteSyncControllerConfig, RemoteSyncControllerState } from './types';

type CheckRemoteSyncStatusPops = {
  state: RemoteSyncControllerState;
  config: RemoteSyncControllerConfig;
};

export function checkRemoteSyncStatus({ state, config }: CheckRemoteSyncStatusPops) {
  const nextStatus = resolveRemoteSyncStatus({
    filesSyncStatus: state.filesSyncStatus,
    foldersSyncStatus: state.foldersSyncStatus,
    syncFiles: config.syncFiles,
    syncFolders: config.syncFolders,
  });

  if (!nextStatus) {
    return;
  }

  changeStatus({
    state,
    newStatus: nextStatus,
  });
}
