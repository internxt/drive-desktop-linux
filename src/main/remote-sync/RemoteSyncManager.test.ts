import { DatabaseCollectionAdapter } from 'main/database/adapters/base';
import { RemoteSyncManager } from './RemoteSyncManager';
import { RemoteSyncedFile, RemoteSyncedFolder } from './helpers';
import * as uuid from 'uuid';
import axios from 'axios';

jest.mock('axios');
jest.mock('electron-store');
const mockedAxios = axios as jest.Mocked<typeof axios>;

const inMemorySyncedFilesCollection: DatabaseCollectionAdapter<RemoteSyncedFile> =
  {
    get: jest.fn(),
    connect: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
    remove: jest.fn(),
  };

const inMemorySyncedFoldersCollection: DatabaseCollectionAdapter<RemoteSyncedFolder> =
  {
    get: jest.fn(),
    connect: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
    remove: jest.fn(),
  };

const createRemoteSyncedFileFixture = (
  payload: Partial<RemoteSyncedFile>
): RemoteSyncedFile => {
  const result: RemoteSyncedFile = {
    plainName: `file_${Date.now()}`,
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

  return result;
};

const createRemoteSyncedFolderFixture = (
  payload: Partial<RemoteSyncedFolder>
): RemoteSyncedFolder => {
  const result: RemoteSyncedFolder = {
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

  return result;
};

describe('RemoteSyncManager', () => {
  let sut: RemoteSyncManager = new RemoteSyncManager(
    {
      folders: inMemorySyncedFoldersCollection,
      files: inMemorySyncedFilesCollection,
    },
    {
      httpClient: mockedAxios,
      fetchFilesLimitPerRequest: 2,
      fetchFoldersLimitPerRequest: 2,
      syncFiles: true,
      syncFolders: true,
    }
  );
  beforeEach(() => {
    sut = new RemoteSyncManager(
      {
        folders: inMemorySyncedFoldersCollection,
        files: inMemorySyncedFilesCollection,
      },
      {
        httpClient: mockedAxios,
        fetchFilesLimitPerRequest: 2,
        fetchFoldersLimitPerRequest: 2,
        syncFiles: true,
        syncFolders: true,
      }
    );
    mockedAxios.get.mockClear();
  });

  it('Should fetch 2 pages of remote files', async () => {
    const sut = new RemoteSyncManager(
      {
        folders: inMemorySyncedFoldersCollection,
        files: inMemorySyncedFilesCollection,
      },
      {
        httpClient: mockedAxios,
        fetchFilesLimitPerRequest: 2,
        fetchFoldersLimitPerRequest: 2,
        syncFiles: true,
        syncFolders: false,
      }
    );

    mockedAxios.get
      .mockResolvedValueOnce({
        data: [
          createRemoteSyncedFileFixture({
            plainName: 'file_1',
          }),
          createRemoteSyncedFileFixture({
            plainName: 'file_2',
          }),
        ],
      })
      .mockResolvedValueOnce({
        data: [
          createRemoteSyncedFileFixture({
            plainName: 'file_3',
          }),
        ],
      });

    await sut.startRemoteSync();

    expect(mockedAxios.get).toBeCalledTimes(2);
    expect(sut.getSyncStatus()).toBe('SYNCED');
  });

  it('Should fetch 3 pages of remote folders', async () => {
    const sut = new RemoteSyncManager(
      {
        folders: inMemorySyncedFoldersCollection,
        files: inMemorySyncedFilesCollection,
      },
      {
        httpClient: mockedAxios,
        fetchFilesLimitPerRequest: 2,
        fetchFoldersLimitPerRequest: 2,
        syncFiles: false,
        syncFolders: true,
      }
    );

    mockedAxios.get
      .mockResolvedValueOnce({
        data: [
          createRemoteSyncedFolderFixture({
            plainName: 'folder_1',
          }),
          createRemoteSyncedFolderFixture({
            plainName: 'folder_2',
          }),
        ],
      })
      .mockResolvedValueOnce({
        data: [
          createRemoteSyncedFolderFixture({
            plainName: 'folder_3',
          }),
          createRemoteSyncedFolderFixture({
            plainName: 'folder_4',
          }),
        ],
      })
      .mockResolvedValueOnce({
        data: [
          createRemoteSyncedFolderFixture({
            plainName: 'folder_5',
          }),
        ],
      });

    await sut.startRemoteSync();

    expect(mockedAxios.get).toBeCalledTimes(3);
    expect(sut.getSyncStatus()).toBe('SYNCED');
  });

  it('Should retry N times and then stop if sync does not succeed', async () => {
    mockedAxios.get.mockImplementation(() => Promise.reject('Fail on purpose'));

    await sut.startRemoteSync();

    expect(mockedAxios.get).toBeCalledTimes(6);
    expect(sut.getSyncStatus()).toBe('SYNC_FAILED');
  });

  it('Should fail the sync if some files or folders cannot be retrieved', async () => {
    const sut = new RemoteSyncManager(
      {
        folders: inMemorySyncedFoldersCollection,
        files: inMemorySyncedFilesCollection,
      },
      {
        httpClient: mockedAxios,
        fetchFilesLimitPerRequest: 2,
        fetchFoldersLimitPerRequest: 2,
        syncFiles: true,
        syncFolders: true,
      }
    );

    mockedAxios.get.mockRejectedValueOnce('Fail on purpose');

    await sut.startRemoteSync();

    expect(mockedAxios.get).toBeCalledTimes(6);
    expect(sut.getSyncStatus()).toBe('SYNC_FAILED');
  });

  it('Should save the files in the database', async () => {
    const sut = new RemoteSyncManager(
      {
        folders: inMemorySyncedFoldersCollection,
        files: inMemorySyncedFilesCollection,
      },
      {
        httpClient: mockedAxios,
        fetchFilesLimitPerRequest: 2,
        fetchFoldersLimitPerRequest: 2,
        syncFiles: true,
        syncFolders: false,
      }
    );
    const file1 = createRemoteSyncedFileFixture({
      plainName: 'file_1',
    });

    const file2 = createRemoteSyncedFileFixture({
      plainName: 'file_2',
    });

    mockedAxios.get.mockResolvedValueOnce({ data: [file1, file2] });

    mockedAxios.get.mockResolvedValueOnce({ data: [] });

    await sut.startRemoteSync();

    expect(mockedAxios.get).toBeCalledTimes(2);
    expect(sut.getSyncStatus()).toBe('SYNCED');
    expect(inMemorySyncedFilesCollection.create).toHaveBeenCalledWith(file1);
    expect(inMemorySyncedFilesCollection.create).toHaveBeenCalledWith(file2);
  });
});
