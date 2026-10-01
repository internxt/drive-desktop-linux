import eventBus from '../../../apps/main/event-bus';
import * as virtualDriveServiceModule from './services/drive-folder/virtual-drive.service';
import { remoteSyncManager } from '../../../apps/main/remote-sync/service';
import * as initialSyncReadyModule from '../../../apps/main/remote-sync/InitialSyncReady';
import { registerVirtualDriveHandlers } from './ipc/handlers';
import { registerRemoteSyncHandlers } from '../../../apps/main/remote-sync/handlers';
import { partialSpyOn, calls } from '../../../../tests/vitest/utils.helper';

describe('early mount wiring', () => {
  const startVirtualDriveSpy = partialSpyOn(virtualDriveServiceModule, 'startVirtualDrive');
  const startRemoteSyncSpy = partialSpyOn(remoteSyncManager, 'startRemoteSync');
  const resetRemoteSyncSpy = partialSpyOn(remoteSyncManager, 'resetRemoteSync');
  const setInitialSyncStateSpy = partialSpyOn(initialSyncReadyModule, 'setInitialSyncState');

  beforeEach(() => {
    eventBus.removeAllListeners();
    startVirtualDriveSpy.mockResolvedValue(undefined);
    startRemoteSyncSpy.mockResolvedValue(undefined);
    resetRemoteSyncSpy.mockReturnValue(undefined);
    setInitialSyncStateSpy.mockReturnValue(true);
    registerVirtualDriveHandlers();
    registerRemoteSyncHandlers();
  });

  afterEach(() => {
    eventBus.removeAllListeners();
  });

  it('mounts virtual drive on APP_DATA_SOURCE_INITIALIZED before remote sync finishes', async () => {
    // When database is initialized
    eventBus.emit('APP_DATA_SOURCE_INITIALIZED');

    // Virtual drive mount is triggered immediately
    calls(startVirtualDriveSpy).toHaveLength(1);

    // Remote sync manager starts in parallel
    calls(startRemoteSyncSpy).toHaveLength(1);

    // Mount was triggered before INITIAL_SYNC_READY was ever emitted
    expect(eventBus.listenerCount('INITIAL_SYNC_READY')).toBe(0);
  });

  it('resets sync state on USER_LOGGED_OUT', () => {
    eventBus.emit('USER_LOGGED_OUT');

    calls(resetRemoteSyncSpy).toHaveLength(1);
    calls(setInitialSyncStateSpy).toHaveLength(1);
    expect(setInitialSyncStateSpy).toHaveBeenCalledWith('NOT_READY');
  });
});
