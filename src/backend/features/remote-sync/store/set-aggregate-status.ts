import { logger } from '@internxt/drive-desktop-core/build/backend';
import type { RemoteSyncStatus } from '../types';
import { remoteSyncState } from './remote-sync-state';

function notifyStatusChange(newStatus: RemoteSyncStatus) {
  remoteSyncState.statusListeners.forEach((listener) => {
    if (typeof listener !== 'function') return;
    listener(newStatus);
  });
}

export function setAggregateStatus(newStatus: RemoteSyncStatus) {
  if (newStatus === remoteSyncState.status) return;

  logger.debug({
    tag: 'SYNC-ENGINE',
    msg: `RemoteSyncManager ${remoteSyncState.status} -> ${newStatus}`,
  });
  remoteSyncState.status = newStatus;
  notifyStatusChange(newStatus);
}
