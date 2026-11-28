import type { RemoteSyncStatus } from '../types';
import { remoteSyncState } from './remote-sync-state';
import { subscribeRemoteSyncStore } from './subscribe-remote-sync-store';

describe('subscribe-remote-sync-store', () => {
  beforeEach(() => {
    remoteSyncState.statusListeners.length = 0;
  });

  it('should register and remove a status listener', () => {
    const listener = vi.fn();

    const unsubscribe = subscribeRemoteSyncStore(listener);

    expect(remoteSyncState.statusListeners).toStrictEqual([listener]);

    unsubscribe();

    expect(remoteSyncState.statusListeners).toStrictEqual([]);
  });

  it('should ignore a listener that is not a function', () => {
    const unsubscribe = subscribeRemoteSyncStore(undefined as unknown as (newStatus: RemoteSyncStatus) => void);

    expect(remoteSyncState.statusListeners).toStrictEqual([]);
    expect(unsubscribe()).toBeUndefined();
  });
});
