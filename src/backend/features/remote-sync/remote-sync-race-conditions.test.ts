vi.mock('@internxt/drive-desktop-core/build/backend');
vi.mock('../../../infra/drive-server/client/drive-server.client.instance', () => ({
  driveServerClient: {
    GET: vi.fn(),
  },
}));
vi.mock('../../../apps/main/remote-sync/RemoteSyncErrorHandler/RemoteSyncErrorHandler', () => ({
  RemoteSyncErrorHandler: class {
    handleSyncError = vi.fn();
  },
}));
vi.mock('../../../infra/sqlite/services/file/create-or-update-file-by-batch', () => ({
  createOrUpdateFileByBatch: vi.fn().mockResolvedValue({ data: [] }),
}));
vi.mock('../../../infra/sqlite/services/folder/create-or-update-folder-by-batch', () => ({
  createOrUpdateFolderByBatch: vi.fn().mockResolvedValue({ data: [] }),
}));
vi.mock('../virtual-drive/services/lazy/directory-state-sqlite-repository', () => ({
  DirectoryStateRepository: {
    getFreshDirectoryStates: vi.fn(),
    invalidate: vi.fn(),
  },
}));

import { RemoteSyncManager } from '../../../apps/main/remote-sync/RemoteSyncManager';
import { RemoteSyncErrorHandler } from '../../../apps/main/remote-sync/RemoteSyncErrorHandler/RemoteSyncErrorHandler';
import { driveServerClient } from '../../../infra/drive-server/client/drive-server.client.instance';
import { createOrUpdateFileByBatch } from '../../../infra/sqlite/services/file/create-or-update-file-by-batch';
import { createOrUpdateFolderByBatch } from '../../../infra/sqlite/services/folder/create-or-update-folder-by-batch';
import { DirectoryStateRepository } from '../virtual-drive/services/lazy/directory-state-sqlite-repository';
import { DatabaseCollectionAdapter } from '../../../apps/main/database/adapters/base';
import { DriveFile } from '../../../apps/main/database/entities/DriveFile';
import { DriveFolder } from '../../../apps/main/database/entities/DriveFolder';
import { DriveServerError } from '../../../infra/drive-server/drive-server.error';

const mockedGet = vi.mocked(driveServerClient.GET as unknown as (...args: unknown[]) => Promise<unknown>);
const mockedCreateOrUpdateFileByBatch = vi.mocked(createOrUpdateFileByBatch);
const mockedCreateOrUpdateFolderByBatch = vi.mocked(createOrUpdateFolderByBatch);
const mockedGetFreshDirectoryStates = vi.mocked(DirectoryStateRepository.getFreshDirectoryStates);
const mockedInvalidate = vi.mocked(DirectoryStateRepository.invalidate);

describe('remote-sync-race-conditions', () => {
  let sut: RemoteSyncManager;
  let filesDb: DatabaseCollectionAdapter<DriveFile>;
  let foldersDb: DatabaseCollectionAdapter<DriveFolder>;
  let errorHandler: RemoteSyncErrorHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetFreshDirectoryStates.mockResolvedValue(new Map());
    mockedInvalidate.mockResolvedValue(undefined);
    mockedCreateOrUpdateFileByBatch.mockResolvedValue({ data: [] });
    mockedCreateOrUpdateFolderByBatch.mockResolvedValue({ data: [] });

    filesDb = {
      connect: vi.fn().mockResolvedValue(undefined),
      get: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
      remove: vi.fn(),
      getLastUpdated: vi.fn().mockResolvedValue({ success: false, result: null }),
    };

    foldersDb = {
      connect: vi.fn().mockResolvedValue(undefined),
      get: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
      remove: vi.fn(),
      getLastUpdated: vi.fn().mockResolvedValue({ success: false, result: null }),
    };

    errorHandler = new RemoteSyncErrorHandler();

    sut = new RemoteSyncManager(
      { files: filesDb, folders: foldersDb },
      {
        fetchFilesLimitPerRequest: 10,
        fetchFoldersLimitPerRequest: 10,
        syncFiles: true,
        syncFolders: true,
        retryDelayMs: 1,
      },
      errorHandler,
    );
  });

  describe('concurrent execution', () => {
    it('prevents multiple concurrent background syncs from starting simultaneously', async () => {
      mockedGet.mockImplementation(async (endpoint: unknown) => {
        if (endpoint === '/folders') return { data: [] };
        if (endpoint === '/files/sync') return { data: { files: [], nextCursor: null } };
        return { data: [] };
      });

      const firstSync = sut.startRemoteSync();
      const secondSync = sut.startRemoteSync();

      await Promise.all([firstSync, secondSync]);

      expect(sut.getSyncStatus()).toBe('SYNCED');
      expect(mockedGet).toHaveBeenCalledTimes(2);
    });
  });

  describe('stale data protection against recent lazy sync', () => {
    it('does not overwrite freshly lazily-loaded files with older background sync batches', async () => {
      const freshLoadedAt = new Date('2026-06-01T12:00:00.000Z');
      mockedGetFreshDirectoryStates.mockResolvedValue(new Map([[42, freshLoadedAt]]));

      mockedGet.mockImplementation(async (endpoint: unknown) => {
        if (endpoint === '/folders') return { data: [] };
        if (endpoint === '/files/sync') {
          return {
            data: {
              files: [
                {
                  id: 1,
                  uuid: 'stale-uuid',
                  fileId: 'f-1',
                  type: 'txt',
                  size: '100',
                  bucket: 'b',
                  folderId: 42,
                  userId: 1,
                  modificationTime: '2026-06-01T10:00:00.000Z',
                  createdAt: '2026-06-01T10:00:00.000Z',
                  updatedAt: '2026-06-01T11:00:00.000Z', // older than freshLoadedAt 12:00
                  plainName: 'stale-doc',
                  status: 'EXISTS',
                },
                {
                  id: 2,
                  uuid: 'unmanaged-uuid',
                  fileId: 'f-2',
                  type: 'txt',
                  size: '200',
                  bucket: 'b',
                  folderId: 999, // not in freshDirectoryStates
                  userId: 1,
                  modificationTime: '2026-06-01T10:00:00.000Z',
                  createdAt: '2026-06-01T10:00:00.000Z',
                  updatedAt: '2026-06-01T11:00:00.000Z',
                  plainName: 'unmanaged-doc',
                  status: 'EXISTS',
                },
              ],
              nextCursor: null,
            },
          };
        }
        return { data: [] };
      });

      await sut.startRemoteSync();

      expect(mockedCreateOrUpdateFileByBatch).toHaveBeenCalledWith({
        files: [expect.objectContaining({ uuid: 'unmanaged-uuid' })],
      });
      expect(mockedInvalidate).not.toHaveBeenCalled();
    });

    it('persists genuinely newer remote files and invalidates cached directory state', async () => {
      const freshLoadedAt = new Date('2026-06-01T12:00:00.000Z');
      mockedGetFreshDirectoryStates.mockResolvedValue(new Map([[42, freshLoadedAt]]));

      mockedGet.mockImplementation(async (endpoint: unknown) => {
        if (endpoint === '/folders') return { data: [] };
        if (endpoint === '/files/sync') {
          return {
            data: {
              files: [
                {
                  id: 3,
                  uuid: 'newer-uuid',
                  fileId: 'f-3',
                  type: 'txt',
                  size: '300',
                  bucket: 'b',
                  folderId: 42,
                  userId: 1,
                  modificationTime: '2026-06-01T13:00:00.000Z',
                  createdAt: '2026-06-01T10:00:00.000Z',
                  updatedAt: '2026-06-01T13:00:00.000Z', // newer than freshLoadedAt 12:00
                  plainName: 'newer-doc',
                  status: 'EXISTS',
                },
              ],
              nextCursor: null,
            },
          };
        }
        return { data: [] };
      });

      await sut.startRemoteSync();

      expect(mockedCreateOrUpdateFileByBatch).toHaveBeenCalledWith({
        files: [expect.objectContaining({ uuid: 'newer-uuid' })],
      });
      expect(mockedInvalidate).toHaveBeenCalledWith({ folderId: 42, statusScope: 'EXISTS' });
    });
  });

  describe('retry resilience', () => {
    it('recovers and completes sync when transient error resolves on retry', async () => {
      let folderAttempts = 0;
      mockedGet.mockImplementation(async (endpoint: unknown) => {
        if (endpoint === '/folders') {
          folderAttempts++;
          if (folderAttempts === 1) {
            return { error: new DriveServerError('SERVER_ERROR', 500, 'Temporary glitch') };
          }
          return { data: [] };
        }
        if (endpoint === '/files/sync') {
          return { data: { files: [], nextCursor: null } };
        }
        return { data: [] };
      });

      await sut.startRemoteSync();

      expect(folderAttempts).toBe(2);
      expect(sut.getSyncStatus()).toBe('SYNCED');
    });

    it('sets status to SYNC_FAILED when all retries are exhausted', async () => {
      mockedGet.mockResolvedValue({ error: new DriveServerError('SERVER_ERROR', 500, 'Persistent outage') });

      await sut.startRemoteSync();

      expect(sut.getSyncStatus()).toBe('SYNC_FAILED');
    });
  });
});
