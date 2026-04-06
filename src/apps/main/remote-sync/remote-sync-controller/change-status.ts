import { logger } from '@internxt/drive-desktop-core/build/backend';
import { RemoteSyncStatus } from '../helpers';
import { RemoteSyncControllerState } from './types';

type ChangeStatusPops = {
  state: RemoteSyncControllerState;
  newStatus: RemoteSyncStatus;
};

export function changeStatus({ state, newStatus }: ChangeStatusPops) {
  if (newStatus === state.status) {
    return;
  }

  logger.debug({
    tag: 'SYNC-ENGINE',
    msg: `Remote sync controller ${state.status} -> ${newStatus}`,
  });

  state.status = newStatus;
  state.onStatusChangeCallbacks.forEach((callback) => {
    if (typeof callback !== 'function') {
      return;
    }

    callback(newStatus);
  });
}
