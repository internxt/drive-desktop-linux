import { RemoteSyncStatus } from '../helpers';
import { RemoteSyncControllerState } from './types';

type ControllerStatePops = {
  state: RemoteSyncControllerState;
};

type OnStatusChangePops = ControllerStatePops & {
  callback: (newStatus: RemoteSyncStatus) => void;
};

export function getTotalFilesSynced({ state }: ControllerStatePops) {
  return state.totalFilesSynced;
}

export function onStatusChange({ state, callback }: OnStatusChangePops) {
  if (typeof callback !== 'function') {
    return;
  }

  state.onStatusChangeCallbacks.push(callback);
}

export function getSyncStatus({ state }: ControllerStatePops) {
  return state.status;
}