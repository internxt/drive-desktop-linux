import { ipcMain } from 'electron';
import { logger } from '@internxt/drive-desktop-core/build/backend';
import { vi } from 'vitest';
import { getIpcHandler } from '../../../../tests/vitest/ipc.helper';
import { call, calls, partialSpyOn } from '../../../../tests/vitest/utils.helper';

const mocks = vi.hoisted(() => {
  return {
    remoteSyncController: {
      getSyncStatus: vi.fn(() => 'IDLE'),
      resetRemoteSync: vi.fn(),
      startRemoteSync: vi.fn(),
    },
    resyncRemoteSync: vi.fn(),
    startRemoteSync: vi.fn(),
  };
});

vi.mock('./service', () => ({
  remoteSyncController: mocks.remoteSyncController,
  resyncRemoteSync: mocks.resyncRemoteSync,
  startRemoteSync: mocks.startRemoteSync,
}));

async function loadHandlersModule() {
  vi.resetModules();

  const eventBusModule = await import('../event-bus');
  const initialSyncReadyModule = await import('./InitialSyncReady');

  const eventBusOnMock = partialSpyOn(eventBusModule.default, 'on', false);
  const eventBusEmitMock = partialSpyOn(eventBusModule.default, 'emit');
  const setInitialSyncStateMock = partialSpyOn(initialSyncReadyModule, 'setInitialSyncState');

  await import('./handlers');

  return {
    eventBusEmitMock,
    eventBusOnMock,
    setInitialSyncStateMock,
  };
}

function getEventBusHandler(eventBusOnMock: ReturnType<typeof partialSpyOn>, eventName: string) {
  const calls = eventBusOnMock.mock.calls as Array<[string, (...args: unknown[]) => unknown]>;

  return calls.find(([name]) => name === eventName)?.[1] as ((...args: unknown[]) => unknown) | undefined;
}

describe('handlers.test', () => {
  beforeEach(() => {
    mocks.remoteSyncController.getSyncStatus.mockReturnValue('IDLE');
    mocks.startRemoteSync.mockResolvedValue(undefined);
    mocks.remoteSyncController.startRemoteSync.mockResolvedValue(undefined);
    mocks.resyncRemoteSync.mockResolvedValue(undefined);
  });

  it('should register ipc handlers and event listeners', async () => {
    // When
    const { eventBusOnMock } = await loadHandlersModule();

    // Then
    expect(ipcMain.handle).toHaveBeenCalledWith('START_REMOTE_SYNC', expect.any(Function));
    expect(ipcMain.handle).toHaveBeenCalledWith('get-remote-sync-status', expect.any(Function));
    expect(eventBusOnMock).toHaveBeenCalledWith('RECEIVED_REMOTE_CHANGES', expect.any(Function));
    expect(eventBusOnMock).toHaveBeenCalledWith('APP_DATA_SOURCE_INITIALIZED', expect.any(Function));
    expect(eventBusOnMock).toHaveBeenCalledWith('USER_LOGGED_OUT', expect.any(Function));
  });

  it('should start a sync from the ipc handler and emit remote changes synched', async () => {
    // Given
    const { eventBusEmitMock } = await loadHandlersModule();
    const handler = getIpcHandler('START_REMOTE_SYNC');

    // When
    await handler?.();

    // Then
    calls(mocks.startRemoteSync).toHaveLength(1);
    call(eventBusEmitMock).toStrictEqual('REMOTE_CHANGES_SYNCHED');
  });

  it('should return the current sync status from the ipc handler', async () => {
    // Given
    mocks.remoteSyncController.getSyncStatus.mockReturnValue('SYNCED');
    await loadHandlersModule();
    const handler = getIpcHandler('get-remote-sync-status');

    // When
    const result = await handler?.();

    // Then
    expect(result).toBe('SYNCED');
  });

  it('should resync when remote changes are received', async () => {
    // Given
    const { eventBusOnMock } = await loadHandlersModule();
    const listener = getEventBusHandler(eventBusOnMock, 'RECEIVED_REMOTE_CHANGES');

    // When
    await listener?.();

    // Then
    calls(mocks.resyncRemoteSync).toHaveLength(1);
  });

  it('should start the sync when the data source is initialized', async () => {
    // Given
    const { eventBusOnMock } = await loadHandlersModule();
    const listener = getEventBusHandler(eventBusOnMock, 'APP_DATA_SOURCE_INITIALIZED');

    // When
    await listener?.();

    // Then
    calls(mocks.startRemoteSync).toHaveLength(1);
  });

  it('should log an error when sync startup fails during app data source initialization', async () => {
    // Given
    const error = new Error('sync failed');
    mocks.startRemoteSync.mockRejectedValue(error);
    const { eventBusOnMock } = await loadHandlersModule();
    const listener = getEventBusHandler(eventBusOnMock, 'APP_DATA_SOURCE_INITIALIZED');

    // When
    await listener?.();

    // Then
    expect(logger.error).toHaveBeenCalledWith({
      tag: 'SYNC-ENGINE',
      msg: 'Error starting remote sync controller',
      error,
    });
  });

  it('should reset initial sync state and remote sync state on logout', async () => {
    // Given
    const { eventBusOnMock, setInitialSyncStateMock } = await loadHandlersModule();
    const listener = getEventBusHandler(eventBusOnMock, 'USER_LOGGED_OUT');

    // When
    listener?.();

    // Then
    call(setInitialSyncStateMock).toBe('NOT_READY');
    calls(mocks.remoteSyncController.resetRemoteSync).toHaveLength(1);
  });
});
