import * as debounceModule from 'lodash';
import * as eventBusModule from '../event-bus';
import * as windowsModule from '../windows';
import * as subscribeRemoteSyncStoreModule from '../../../backend/features/remote-sync/store/subscribe-remote-sync-store';
import { call, partialSpyOn } from 'tests/vitest/utils.helper';
import type { DebouncedFunc } from 'lodash';

const { startRemoteSyncMock, subscribeRemoteSyncStoreMock, emitMock, broadcastToWindowsMock, debounceMock } =
  vi.hoisted(() => ({
    startRemoteSyncMock: vi.fn(),
    subscribeRemoteSyncStoreMock: vi.fn(),
    emitMock: vi.fn(),
    broadcastToWindowsMock: vi.fn(),
    debounceMock: vi.fn(),
  }));

vi.mock('lodash', () => ({
  debounce: debounceMock,
}));

vi.mock('../event-bus', () => ({
  default: {
    emit: emitMock,
  },
}));

vi.mock('../windows', () => ({
  broadcastToWindows: broadcastToWindowsMock,
}));

vi.mock('../../../backend/features/remote-sync/store/subscribe-remote-sync-store', () => ({
  subscribeRemoteSyncStore: subscribeRemoteSyncStoreMock,
}));

vi.mock('./RemoteSyncErrorHandler/RemoteSyncErrorHandler', () => ({
  RemoteSyncErrorHandler: class {
    handleSyncError = vi.fn();
  },
}));

vi.mock('../database/collections/DriveFileCollection', () => ({
  DriveFilesCollection: class {
    getAll = vi.fn();
  },
}));

vi.mock('../database/collections/DriveFolderCollection', () => ({
  DriveFoldersCollection: class {
    getAll = vi.fn();
  },
}));

vi.mock('./RemoteSyncManager', () => ({
  RemoteSyncManager: vi.fn(function RemoteSyncManagerMock(this: { startRemoteSync: typeof startRemoteSyncMock }) {
    this.startRemoteSync = startRemoteSyncMock;
  }),
}));

let serviceModule: typeof import('./service');

describe('remote sync service', () => {
  const debounceSpy = partialSpyOn(debounceModule, 'debounce');
  const eventBusEmitSpy = partialSpyOn(eventBusModule.default, 'emit');
  const broadcastToWindowsSpy = partialSpyOn(windowsModule, 'broadcastToWindows');
  const subscribeRemoteSyncStoreSpy = partialSpyOn(subscribeRemoteSyncStoreModule, 'subscribeRemoteSyncStore');

  beforeEach(async () => {
    vi.resetModules();
    startRemoteSyncMock.mockResolvedValue(undefined);
    subscribeRemoteSyncStoreMock.mockReturnValue(() => undefined);
    debounceMock.mockImplementation((fn: () => Promise<void>) => {
      const debounced = vi.fn(async () => fn()) as unknown as DebouncedFunc<() => Promise<void>>;
      debounced.cancel = vi.fn();
      return debounced;
    });

    debounceSpy.mockImplementation((fn: (...args: unknown[]) => unknown) => {
      const debounced = vi.fn(async () => fn()) as unknown as DebouncedFunc<() => Promise<unknown>>;
      debounced.cancel = vi.fn();
      return debounced;
    });
    eventBusEmitSpy.mockImplementation(() => true);
    broadcastToWindowsSpy.mockImplementation(() => undefined);
    subscribeRemoteSyncStoreSpy.mockImplementation(() => () => undefined);

    serviceModule = await import('./service');
  });

  it('should start the remote sync through the manager', async () => {
    await serviceModule.startRemoteSync();

    expect(startRemoteSyncMock).toHaveBeenCalledTimes(1);
  });

  it('should resynchronize remote changes and emit the completion event', async () => {
    await serviceModule.resyncRemoteSync();

    call(debounceSpy).toStrictEqual([expect.any(Function), 3_000]);
    expect(startRemoteSyncMock).toHaveBeenCalledTimes(1);
    expect(eventBusEmitSpy).toHaveBeenCalledWith('REMOTE_CHANGES_SYNCHED');
  });

  it('should cancel the pending remote sync', () => {
    serviceModule.cancelPendingRemoteSync();

    const debouncedFunction = debounceMock.mock.results.at(-1)?.value as { cancel?: () => void };
    expect(debouncedFunction.cancel).toHaveBeenCalledTimes(1);
  });

  it('should register the status listener on the remote sync store', () => {
    expect(serviceModule.remoteSyncManager).toBeDefined();
    expect(subscribeRemoteSyncStoreMock).toHaveBeenCalledTimes(1);
  });
});
