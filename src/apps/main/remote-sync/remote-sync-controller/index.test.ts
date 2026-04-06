vi.mock('@internxt/drive-desktop-core/build/backend');
vi.mock('../../../../infra/drive-server/client/drive-server.client.instance', () => ({
  driveServerClient: {
    GET: vi.fn(),
  },
}));
vi.mock('../../../../infra/sqlite/services/file/create-or-update-file-by-batch', () => ({
  createOrUpdateFileByBatch: vi.fn().mockResolvedValue({ data: [] }),
}));
vi.mock('../../../../infra/sqlite/services/folder/create-or-update-folder-by-batch', () => ({
  createOrUpdateFolderByBatch: vi.fn().mockResolvedValue({ data: [] }),
}));

import * as uuid from 'uuid';
import { createRemoteSyncController, CreateRemoteSyncControllerPops, RemoteSyncController } from './index';
import { RemoteSyncErrorHandler } from '../create-remote-sync-error-handler';
import { RemoteSyncedFile, RemoteSyncedFolder } from '../helpers';
import { DriveServerError } from '../../../../infra/drive-server/drive-server.error';
import { driveServerClient } from '../../../../infra/drive-server/client/drive-server.client.instance';
import { DatabaseCollectionAdapter } from '../../database/adapters/base';
import { DriveFile } from '../../database/entities/DriveFile';
import { DriveFolder } from '../../database/entities/DriveFolder';
import { createOrUpdateFileByBatch } from '../../../../infra/sqlite/services/file/create-or-update-file-by-batch';
import { createOrUpdateFolderByBatch } from '../../../../infra/sqlite/services/folder/create-or-update-folder-by-batch';

const mockedGet = vi.mocked(
  driveServerClient.GET as (...args: unknown[]) => Promise<{ data?: unknown; error?: unknown }>,
);
const mockedCreateOrUpdateFileByBatch = vi.mocked(createOrUpdateFileByBatch);
const mockedCreateOrUpdateFolderByBatch = vi.mocked(createOrUpdateFolderByBatch);

const inMemorySyncedFilesCollection: DatabaseCollectionAdapter<DriveFile> = {
  get: vi.fn(),
  connect: vi.fn(),
  update: vi.fn(),
  create: vi.fn(),
  remove: vi.fn(),
  getLastUpdated: vi.fn(),
};

const inMemorySyncedFoldersCollection: DatabaseCollectionAdapter<DriveFolder> = {
  get: vi.fn(),
  connect: vi.fn(),
  update: vi.fn(),
  create: vi.fn(),
  remove: vi.fn(),
  getLastUpdated: vi.fn(),
};

function createRemoteSyncedFileFixture(payload: Partial<RemoteSyncedFile>): RemoteSyncedFile {
  return {
    status: 'EXISTS',
    name: `name_${uuid.v4()}`,
    plainName: `plainname_${Date.now()}`,
    id: Date.now(),
    uuid: uuid.v4(),
    fileId: Date.now().toString(),
    type: 'jpg',
    size: 999,
    bucket: `bucket_${Date.now()}`,
    folderId: 555,
    folderUuid: uuid.v4(),
    userId: 567,
    modificationTime: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...payload,
  };
}

function createRemoteSyncedFolderFixture(payload: Partial<RemoteSyncedFolder>): RemoteSyncedFolder {
  return {
    name: `name_${uuid.v4()}`,
    plainName: `folder_${Date.now()}`,
    id: Date.now(),
    type: 'folder',
    bucket: `bucket_${Date.now()}`,
    userId: 567,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    parentId: null,
    uuid: uuid.v4(),
    status: 'EXISTS',
    ...payload,
  };
}

describe('index.test', () => {
  let errorHandler: RemoteSyncErrorHandler;
  let sut: RemoteSyncController;
  let props: CreateRemoteSyncControllerPops;

  inMemorySyncedFilesCollection.getLastUpdated = () => Promise.resolve({ success: false, result: null });
  inMemorySyncedFoldersCollection.getLastUpdated = () => Promise.resolve({ success: false, result: null });

  beforeEach(() => {
    errorHandler = {
      handleSyncError: vi.fn(),
    };

    props = {
      db: {
        folders: inMemorySyncedFoldersCollection,
        files: inMemorySyncedFilesCollection,
      },
      config: {
        fetchFilesLimitPerRequest: 2,
        fetchFoldersLimitPerRequest: 2,
        syncFiles: true,
        syncFolders: true,
      },
      errorHandler,
    };

    sut = createRemoteSyncController();
    mockedGet.mockClear();
    mockedCreateOrUpdateFileByBatch.mockClear();
    mockedCreateOrUpdateFolderByBatch.mockClear();
  });

  describe('When there are files in remote, should sync them with local', () => {
    it('Should sync all the files', async () => {
      // Given
      const sut = createRemoteSyncController();
      const syncProps = {
        ...props,
        config: {
          ...props.config,
          syncFolders: false,
        },
      };

      mockedGet
        .mockResolvedValueOnce({
          data: [
            createRemoteSyncedFileFixture({ plainName: 'file_1' }),
            createRemoteSyncedFileFixture({ plainName: 'file_2' }),
          ],
        })
        .mockResolvedValueOnce({
          data: [createRemoteSyncedFileFixture({ plainName: 'file_3' })],
        });

      // When
      await sut.startRemoteSync(syncProps);

      // Then
      expect(mockedGet).toBeCalledTimes(2);
      expect(sut.getSyncStatus()).toBe('SYNCED');
    });

    it('Should sync all the folders', async () => {
      // Given
      const sut = createRemoteSyncController();
      const syncProps = {
        ...props,
        config: {
          ...props.config,
          syncFiles: false,
        },
      };

      mockedGet
        .mockResolvedValueOnce({
          data: [
            createRemoteSyncedFolderFixture({ plainName: 'folder_1' }),
            createRemoteSyncedFolderFixture({ plainName: 'folder_2' }),
          ],
        })
        .mockResolvedValueOnce({
          data: [
            createRemoteSyncedFolderFixture({ plainName: 'folder_3' }),
            createRemoteSyncedFolderFixture({ plainName: 'folder_4' }),
          ],
        })
        .mockResolvedValueOnce({
          data: [createRemoteSyncedFolderFixture({ plainName: 'folder_5' })],
        });

      // When
      await sut.startRemoteSync(syncProps);

      // Then
      expect(mockedGet).toBeCalledTimes(3);
      expect(sut.getSyncStatus()).toBe('SYNCED');
    });

    it('Should save the files in the database', async () => {
      // Given
      const sut = createRemoteSyncController();
      const syncProps = {
        ...props,
        config: {
          ...props.config,
          syncFolders: false,
        },
      };
      const file1 = createRemoteSyncedFileFixture({ plainName: 'file_1' });
      const file2 = createRemoteSyncedFileFixture({ plainName: 'file_2' });

      mockedGet.mockResolvedValueOnce({ data: [file1, file2] });
      mockedGet.mockResolvedValueOnce({ data: [] });

      // When
      await sut.startRemoteSync(syncProps);

      // Then
      expect(mockedGet).toBeCalledTimes(2);
      expect(sut.getSyncStatus()).toBe('SYNCED');
      expect(mockedCreateOrUpdateFileByBatch).toBeCalledWith({ files: [file1, file2] });
    });

    it('Should use the folders limit when syncing folders', async () => {
      // Given
      const sut = createRemoteSyncController();
      const syncProps = {
        ...props,
        config: {
          ...props.config,
          fetchFoldersLimitPerRequest: 7,
          syncFiles: false,
        },
      };

      mockedGet.mockResolvedValueOnce({ data: [] });

      // When
      await sut.startRemoteSync(syncProps);

      // Then
      expect(mockedGet).toBeCalledWith('/folders', {
        query: {
          limit: 7,
          offset: 0,
          status: 'ALL',
          updatedAt: undefined,
        },
      });
    });
  });

  describe('When something fails during the sync', () => {
    it('Should retry N times and then stop if sync does not succeed', async () => {
      // Given
      mockedGet.mockResolvedValue({ error: new DriveServerError('UNKNOWN', undefined, 'Fail on purpose') });

      // When
      await sut.startRemoteSync(props);

      // Then
      expect(mockedGet).toBeCalledTimes(6);
      expect(sut.getSyncStatus()).toBe('SYNC_FAILED');
    });

    it('Should fail the sync if some files or folders cannot be retrieved', async () => {
      // Given
      mockedGet.mockResolvedValueOnce({ error: new DriveServerError('UNKNOWN', undefined, 'Fail on purpose') });

      // When
      await sut.startRemoteSync(props);

      // Then
      expect(mockedGet).toBeCalledTimes(6);
      expect(sut.getSyncStatus()).toBe('SYNC_FAILED');
    });

    it('should handle the error while syncing files by calling the error handler properly', async () => {
      // Given
      const sut = createRemoteSyncController();
      const syncProps = {
        ...props,
        config: {
          ...props.config,
          syncFolders: false,
        },
      };
      mockedGet.mockResolvedValueOnce({ error: new DriveServerError('UNKNOWN', undefined, 'Fail on purpose') });

      // When
      await sut.startRemoteSync(syncProps);

      // Then
      expect(errorHandler.handleSyncError).toHaveBeenCalled();
      expect(vi.mocked(errorHandler.handleSyncError).mock.calls[0][0]).toMatchObject({
        syncItemType: 'files',
      });
    });

    it('should handle the error while syncing folders by calling the error handler properly', async () => {
      // Given
      const sut = createRemoteSyncController();
      const syncProps = {
        ...props,
        config: {
          ...props.config,
          syncFiles: false,
        },
      };

      mockedGet.mockResolvedValueOnce({ error: new DriveServerError('UNKNOWN', undefined, 'Fail on purpose') });

      // When
      await sut.startRemoteSync(syncProps);

      // Then
      expect(errorHandler.handleSyncError).toHaveBeenCalled();
      expect(vi.mocked(errorHandler.handleSyncError).mock.calls[0][0]).toMatchObject({
        syncItemType: 'folders',
      });
    });
  });
});
