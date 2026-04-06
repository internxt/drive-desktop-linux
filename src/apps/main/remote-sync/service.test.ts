import { vi } from 'vitest';
import { call, calls, partialSpyOn } from '../../../../tests/vitest/utils.helper';
import { UpdatedRemoteItemsDto } from '../../../context/shared/application/sync/remote-sync.contract';

function createUpdatedRemoteItemsDtoFixture(): UpdatedRemoteItemsDto {
  return {
    files: [
      {
        bucket: 'bucket-1',
        createdAt: '2024-01-01T00:00:00.000Z',
        fileId: 'file-1',
        folderId: 11,
        id: 1,
        modificationTime: '2024-01-02T00:00:00.000Z',
        name: 'report.txt',
        plainName: 'report',
        size: 128,
        type: 'txt',
        updatedAt: '2024-01-03T00:00:00.000Z',
        userId: 21,
        status: 'EXISTS',
        uuid: 'file-uuid-1',
      },
    ],
    folders: [
      {
        bucket: 'bucket-2',
        createdAt: '2024-02-01T00:00:00.000Z',
        id: 2,
        name: 'Projects',
        parentId: null,
        plainName: 'Projects',
        status: 'EXISTS',
        updatedAt: '2024-02-02T00:00:00.000Z',
        uuid: 'folder-uuid-1',
      },
    ],
  };
}

const mocks = vi.hoisted(() => {
  const filesCollection = {
    getAll: vi.fn(),
    getAllWhere: vi.fn(),
  };

  const foldersCollection = {
    getAll: vi.fn(),
  };

  const controller = {
    onStatusChange: vi.fn(),
    startRemoteSync: vi.fn(),
    getSyncStatus: vi.fn(),
    resetRemoteSync: vi.fn(),
  };

  return {
    debounce: vi.fn((fn: () => unknown) => fn),
    filesCollection,
    foldersCollection,
    controller,
    remoteSyncControllerFactory: vi.fn(() => controller),
  };
});

vi.mock('lodash', () => ({
  debounce: mocks.debounce,
}));

vi.mock('../database/collections/DriveFileCollection', () => ({
  DriveFilesCollection: vi.fn(() => mocks.filesCollection),
}));

vi.mock('../database/collections/DriveFolderCollection', () => ({
  DriveFoldersCollection: vi.fn(() => mocks.foldersCollection),
}));

vi.mock('./remote-sync-controller', () => ({
  createRemoteSyncController: mocks.remoteSyncControllerFactory,
}));

vi.mock('./remote-sync-error-handler', () => ({
  createRemoteSyncErrorHandler: vi.fn(() => ({
    handleSyncError: vi.fn(),
  })),
}));

type ServiceModule = typeof import('./service');

async function loadServiceModule() {
  vi.resetModules();

  const eventBusModule = await import('../event-bus');
  const initialSyncReadyModule = await import('./InitialSyncReady');
  const windowsModule = await import('../windows');

  const eventBusEmitMock = partialSpyOn(eventBusModule.default, 'emit');
  const broadcastToWindowsMock = partialSpyOn(windowsModule, 'broadcastToWindows');
  const getIsInitialSyncReadyMock = partialSpyOn(initialSyncReadyModule, 'isInitialSyncReady');
  const setInitialSyncStateMock = partialSpyOn(initialSyncReadyModule, 'setInitialSyncState');

  getIsInitialSyncReadyMock.mockReturnValue(false);

  const service = (await import('./service')) as ServiceModule;

  return {
    broadcastToWindowsMock,
    eventBusEmitMock,
    getIsInitialSyncReadyMock,
    service,
    setInitialSyncStateMock,
  };
}

function getRegisteredStatusChangeCallback() {
  return mocks.controller.onStatusChange.mock.calls.at(-1)?.[0] as ((status: string) => Promise<void>) | undefined;
}

describe('service.test', () => {
  beforeEach(() => {
    mocks.controller.getSyncStatus.mockReturnValue('IDLE');
    const result = createUpdatedRemoteItemsDtoFixture();
    mocks.filesCollection.getAll.mockResolvedValue({ success: true, result: result.files });
    mocks.foldersCollection.getAll.mockResolvedValue({ success: true, result: result.folders });
    mocks.filesCollection.getAllWhere.mockResolvedValue({ result: [{ uuid: 'file-1' }] });
  });

  it('should mark initial sync as ready and broadcast when the controller becomes synced for the first time', async () => {
    // Given
    const { eventBusEmitMock, broadcastToWindowsMock, setInitialSyncStateMock } = await loadServiceModule();
    const callback = getRegisteredStatusChangeCallback();

    // When
    await callback?.('SYNCED');

    // Then
    call(setInitialSyncStateMock).toBe('READY');
    call(eventBusEmitMock).toBe('INITIAL_SYNC_READY');
    call(broadcastToWindowsMock).toStrictEqual(['remote-sync-status-change', 'SYNCED']);
  });

  it('should only broadcast status changes when initial sync is already ready', async () => {
    // Given
    const { eventBusEmitMock, broadcastToWindowsMock, getIsInitialSyncReadyMock, setInitialSyncStateMock } =
      await loadServiceModule();
    getIsInitialSyncReadyMock.mockReturnValue(true);
    const callback = getRegisteredStatusChangeCallback();

    // When
    await callback?.('SYNCED');

    // Then
    expect(setInitialSyncStateMock).not.toHaveBeenCalled();
    expect(eventBusEmitMock).not.toHaveBeenCalledWith('INITIAL_SYNC_READY');
    call(broadcastToWindowsMock).toStrictEqual(['remote-sync-status-change', 'SYNCED']);
  });

  it('should return updated remote items from both collections', async () => {
    // Given
    const { service } = await loadServiceModule();
    const expected = createUpdatedRemoteItemsDtoFixture();

    // When
    const result = await service.getUpdatedRemoteItems();

    // Then
    expect(result).toStrictEqual(expected);
  });

  it('should throw when files cannot be retrieved from the local database', async () => {
    // Given
    mocks.filesCollection.getAll.mockResolvedValue({ success: false, result: [] });
    const { service } = await loadServiceModule();

    // Then
    await expect(service.getUpdatedRemoteItems()).rejects.toThrow(
      'Failed to retrieve all the drive files from local db',
    );
  });

  it('should delegate startRemoteSync to the controller', async () => {
    // Given
    const { service } = await loadServiceModule();

    // When
    await service.startRemoteSync();

    // Then
    calls(mocks.controller.startRemoteSync).toHaveLength(1);
  });

  it('should run a debounced resync and emit remote changes synched', async () => {
    // Given
    const { eventBusEmitMock, service } = await loadServiceModule();

    // When
    await service.resyncRemoteSync();

    // Then
    calls(mocks.debounce).toHaveLength(1);
    calls(mocks.controller.startRemoteSync).toHaveLength(1);
    call(eventBusEmitMock).toBe('REMOTE_CHANGES_SYNCHED');
  });

  it('should return only existing files from the local collection', async () => {
    // Given
    const { service } = await loadServiceModule();

    // When
    const result = await service.getExistingFiles();

    // Then
    call(mocks.filesCollection.getAllWhere).toStrictEqual({ status: 'EXISTS' });
    expect(result).toStrictEqual([{ uuid: 'file-1' }]);
  });
});
