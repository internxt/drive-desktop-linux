import { createControllerState } from './create-controller-state';
import { getSyncStatus, getTotalFilesSynced, onStatusChange } from './controller-methods';
import { resetRemoteSync as resetRemoteSyncState } from './reset-remote-sync';
import { startRemoteSync as startRemoteSyncProcess } from './start-remote-sync';
import { CreateRemoteSyncControllerPops, RemoteSyncController } from './types';

export type {
  CreateRemoteSyncControllerPops,
  RemoteSyncController,
  RemoteSyncControllerConfig,
  RemoteSyncControllerDb,
  RemoteSyncControllerState,
} from './types';

export function createRemoteSyncController(): RemoteSyncController {
  const state = createControllerState();

  return {
    getTotalFilesSynced: () => getTotalFilesSynced({ state }),
    onStatusChange: (callback) => onStatusChange({ state, callback }),
    getSyncStatus: () => getSyncStatus({ state }),
    resetRemoteSync: () => resetRemoteSyncState({ state }),
    startRemoteSync: (props: CreateRemoteSyncControllerPops) =>
      startRemoteSyncProcess({
        state,
        ...props,
      }),
  };
}