import { logger } from '@internxt/drive-desktop-core/build/backend';
import { call, calls, partialSpyOn } from 'tests/vitest/utils.helper';
import { remoteSyncState } from './remote-sync-state';
import { setAggregateStatus } from './set-aggregate-status';

describe('set-aggregate-status', () => {
  const loggerDebugMock = partialSpyOn(logger, 'debug');

  beforeEach(() => {
    remoteSyncState.status = 'IDLE';
    remoteSyncState.statusListeners.length = 0;
  });

  it('should update the aggregate status and notify listeners', () => {
    const listener = vi.fn();
    remoteSyncState.statusListeners.push(listener);

    setAggregateStatus('SYNCING');

    expect(remoteSyncState.status).toBe('SYNCING');
    call(listener).toBe('SYNCING');
    call(loggerDebugMock).toStrictEqual({
      tag: 'SYNC-ENGINE',
      msg: 'RemoteSyncManager IDLE -> SYNCING',
    });
  });

  it('should ignore an unchanged aggregate status', () => {
    const listener = vi.fn();
    remoteSyncState.status = 'SYNCING';
    remoteSyncState.statusListeners.push(listener);

    setAggregateStatus('SYNCING');

    calls(listener).toHaveLength(0);
    calls(loggerDebugMock).toHaveLength(0);
  });
});
