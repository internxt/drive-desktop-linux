import { partialSpyOn, call, calls } from 'tests/vitest/utils.helper';

import * as fetchFoldersModule from '../../../infra/drive-server/services/folder/services/fetch-folders';
import * as createOrUpdateFolderModule from '../../../infra/sqlite/services/folder/create-or-update-folder-by-batch';
import { DriveServerError } from '../../../infra/drive-server/drive-server.error';
import type { RemoteSyncErrorHandler } from '../../../apps/main/remote-sync/RemoteSyncErrorHandler/RemoteSyncErrorHandler';
import { syncRemoteFolders } from './sync-remote-folders';

describe('sync-remote-folders', () => {
  const fetchFoldersSyncMock = partialSpyOn(fetchFoldersModule, 'fetchFoldersSync');
  const createOrUpdateMock = partialSpyOn(createOrUpdateFolderModule, 'createOrUpdateFolderByBatch');

  const errorHandler = { handleSyncError: vi.fn() } as unknown as RemoteSyncErrorHandler;

  const defaultProps = {
    syncConfig: { retry: 1, maxRetries: 2 },
    folderCheckPoint: undefined as Date | undefined,
    limit: 10,
    errorHandler,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    createOrUpdateMock.mockResolvedValue({ data: [] });
  });

  it('should send status and updatedAt epoch for initial sync', async () => {
    fetchFoldersSyncMock.mockResolvedValue({ data: { folders: [], nextCursor: null } });

    await syncRemoteFolders(defaultProps);

    call(fetchFoldersSyncMock).toMatchObject({
      limit: 10,
      status: 'EXISTS',
      updatedAt: new Date(0).toISOString(),
    });
  });

  it('should send only updatedAt for delta sync', async () => {
    const checkpoint = new Date('2026-01-01T00:00:00.000Z');
    fetchFoldersSyncMock.mockResolvedValue({ data: { folders: [], nextCursor: null } });

    await syncRemoteFolders({ ...defaultProps, folderCheckPoint: checkpoint });

    call(fetchFoldersSyncMock).toMatchObject({ updatedAt: checkpoint.toISOString(), status: undefined });
  });

  it('should pass cursor alongside filter params on subsequent pages', async () => {
    fetchFoldersSyncMock
      .mockResolvedValueOnce({ data: { folders: [], nextCursor: 'cursor-abc' } })
      .mockResolvedValueOnce({ data: { folders: [], nextCursor: null } });

    await syncRemoteFolders(defaultProps);

    calls(fetchFoldersSyncMock).toMatchObject([
      { limit: 10, status: 'EXISTS', updatedAt: new Date(0).toISOString() },
      { limit: 10, status: 'EXISTS', cursor: 'cursor-abc' },
    ]);
  });

  it('should accumulate totalSynced across pages', async () => {
    fetchFoldersSyncMock
      .mockResolvedValueOnce({
        data: {
          folders: [
            {
              id: 1,
              uuid: 'f1',
              type: 'folder',
              bucket: 'b1',
              createdAt: '',
              updatedAt: '',
              plainName: 'f1',
              size: 0,
              creationTime: '',
              modificationTime: '',
              status: 'EXISTS',
              removed: false,
              deleted: false,
              name: 'f1',
              parentId: 0,
              parentUuid: '',
              parent: {},
              userId: 1,
              encryptVersion: '',
            },
            {
              id: 2,
              uuid: 'f2',
              type: 'folder',
              bucket: 'b1',
              createdAt: '',
              updatedAt: '',
              plainName: 'f2',
              size: 0,
              creationTime: '',
              modificationTime: '',
              status: 'EXISTS',
              removed: false,
              deleted: false,
              name: 'f2',
              parentId: 0,
              parentUuid: '',
              parent: {},
              userId: 1,
              encryptVersion: '',
            },
          ],
          nextCursor: 'cursor-1',
        },
      })
      .mockResolvedValueOnce({
        data: {
          folders: [
            {
              id: 3,
              uuid: 'f3',
              type: 'folder',
              bucket: 'b1',
              createdAt: '',
              updatedAt: '',
              plainName: 'f3',
              size: 0,
              creationTime: '',
              modificationTime: '',
              status: 'EXISTS',
              removed: false,
              deleted: false,
              name: 'f3',
              parentId: 0,
              parentUuid: '',
              parent: {},
              userId: 1,
              encryptVersion: '',
            },
          ],
          nextCursor: null,
        },
      });

    const result = await syncRemoteFolders(defaultProps);

    expect(result.data?.totalSynced).toBe(3);
  });

  it('should return error immediately on BAD_REQUEST without retrying', async () => {
    fetchFoldersSyncMock.mockResolvedValue({ error: new DriveServerError('BAD_REQUEST', 400) });

    const result = await syncRemoteFolders(defaultProps);

    expect(fetchFoldersSyncMock).toBeCalledTimes(1);
    expect(result.error).toBeInstanceOf(Error);
    expect(errorHandler.handleSyncError).not.toHaveBeenCalled();
  });

  it('should retry on network error and return error after max retries', async () => {
    fetchFoldersSyncMock.mockResolvedValue({ error: new DriveServerError('NETWORK_ERROR', 500) });

    const result = await syncRemoteFolders(defaultProps);

    expect(fetchFoldersSyncMock).toBeCalledTimes(2);
    expect(result.error).toBeInstanceOf(Error);
    expect(errorHandler.handleSyncError).toHaveBeenCalled();
  });

  it('should persist folders to the database once per page', async () => {
    const folders = [
      {
        id: 1,
        uuid: 'f1',
        type: 'folder',
        bucket: 'b1',
        createdAt: '',
        updatedAt: '',
        plainName: 'f1',
        size: 0,
        creationTime: '',
        modificationTime: '',
        status: 'EXISTS' as const,
        removed: false,
        deleted: false,
        name: 'f1',
        parentId: 0,
        parentUuid: '',
        parent: {},
        userId: 1,
        encryptVersion: '',
      },
    ];
    fetchFoldersSyncMock
      .mockResolvedValueOnce({ data: { folders, nextCursor: 'cursor-1' } })
      .mockResolvedValueOnce({ data: { folders, nextCursor: null } });

    await syncRemoteFolders(defaultProps);

    expect(createOrUpdateMock).toBeCalledTimes(2);
  });
});
