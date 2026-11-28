import type { RemoteSyncStatus } from '../types';
import { remoteSyncState } from './remote-sync-state';

export function subscribeRemoteSyncStore(listener: (newStatus: RemoteSyncStatus) => void) {
  if (typeof listener !== 'function') return () => undefined;

  remoteSyncState.statusListeners.push(listener);

  return () => {
    const index = remoteSyncState.statusListeners.indexOf(listener);
    if (index >= 0) remoteSyncState.statusListeners.splice(index, 1);
  };
}
