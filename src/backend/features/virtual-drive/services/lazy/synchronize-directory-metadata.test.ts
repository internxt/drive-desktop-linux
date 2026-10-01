import { mockDeep } from 'vitest-mock-extended';
import { FolderRepository } from '../../../../../context/virtual-drive/folders/domain/FolderRepository';
import { FileRepository } from '../../../../../context/virtual-drive/files/domain/FileRepository';
import { FolderMother } from '../../../../../context/virtual-drive/folders/domain/__test-helpers__/FolderMother';
import { InMemoryFolderRepository } from '../../../../../context/virtual-drive/folders/infrastructure/InMemoryFolderRepository';
import { InMemoryFileRepository } from '../../../../../context/virtual-drive/files/infrastructure/InMemoryFileRepository';
import { FuseCodes } from '../../../../../apps/drive/fuse/callbacks/FuseCodes';
import { DriveServerError } from '../../../../../infra/drive-server/drive-server.error';
import { synchronizeDirectoryMetadata } from './synchronize-directory-metadata';

const {
  fetchFolderMock,
  createOrUpdateFolderByBatchMock,
  createOrUpdateFileByBatchMock,
  markLoadedMock,
  markErrorMock,
  invalidateMock,
} = vi.hoisted(() => ({
  fetchFolderMock: vi.fn(),
  createOrUpdateFolderByBatchMock: vi.fn(),
  createOrUpdateFileByBatchMock: vi.fn(),
  markLoadedMock: vi.fn(),
  markErrorMock: vi.fn(),
  invalidateMock: vi.fn(),
}));

vi.mock('../../../../../infra/drive-server/services/folder/services/fetch-folder', () => ({
  fetchFolder: fetchFolderMock,
}));

vi.mock('../../../../../infra/sqlite/services/folder/create-or-update-folder-by-batch', () => ({
  createOrUpdateFolderByBatch: createOrUpdateFolderByBatchMock,
}));

vi.mock('../../../../../infra/sqlite/services/file/create-or-update-file-by-batch', () => ({
  createOrUpdateFileByBatch: createOrUpdateFileByBatchMock,
}));

vi.mock('./directory-state-sqlite-repository', () => ({
  DirectoryStateRepository: {
    markLoaded: markLoadedMock,
    markError: markErrorMock,
    invalidate: invalidateMock,
  },
}));

describe('synchronize-directory-metadata', () => {
  const folder = FolderMother.root();
  const folderRepository = mockDeep<FolderRepository>();
  const fileRepository = mockDeep<FileRepository>();

  beforeEach(() => {
    folderRepository.searchByPathPrefix.mockReturnValue([]);
    folderRepository.add.mockResolvedValue(undefined);
    fileRepository.deleteByFolderPath.mockResolvedValue(undefined);
    fileRepository.upsert.mockResolvedValue(false);
    fetchFolderMock.mockResolvedValue({ data: { children: [], files: [] } });
    createOrUpdateFolderByBatchMock.mockResolvedValue({ data: [] });
    createOrUpdateFileByBatchMock.mockResolvedValue({ data: [] });
    markLoadedMock.mockResolvedValue(undefined);
    markErrorMock.mockResolvedValue(undefined);
    invalidateMock.mockResolvedValue(undefined);
  });

  it('should persist remote children and mark the directory as loaded', async () => {
    await synchronizeDirectoryMetadata({ folder, folderRepository, fileRepository });

    expect(fetchFolderMock).toHaveBeenCalledWith(folder.uuid);
    expect(createOrUpdateFolderByBatchMock).toHaveBeenCalledWith({ folders: [] });
    expect(createOrUpdateFileByBatchMock).toHaveBeenCalledWith({ files: [] });
    expect(fileRepository.deleteByFolderPath).toHaveBeenCalledWith(folder.path);
    expect(markLoadedMock).toHaveBeenCalledWith({ folderId: folder.id, statusScope: 'EXISTS' });
    expect(markErrorMock).not.toHaveBeenCalled();
  });

  it('should mark the directory as errored and return EIO when fetching fails', async () => {
    fetchFolderMock.mockResolvedValue({ error: new Error('network failure') });

    await expect(synchronizeDirectoryMetadata({ folder, folderRepository, fileRepository })).rejects.toMatchObject({
      code: FuseCodes.EIO,
    });

    expect(markErrorMock).toHaveBeenCalledWith({ folderId: folder.id, statusScope: 'EXISTS' });
  });

  it('should return ENOENT when the directory no longer exists remotely', async () => {
    fetchFolderMock.mockResolvedValue({ error: new DriveServerError('NOT_FOUND') });

    await expect(synchronizeDirectoryMetadata({ folder, folderRepository, fileRepository })).rejects.toMatchObject({
      code: FuseCodes.ENOENT,
    });

    expect(markErrorMock).toHaveBeenCalledWith({ folderId: folder.id, statusScope: 'EXISTS' });
  });

  it('should preserve the root folder when refreshing its children', async () => {
    const rootFolder = FolderMother.root();
    const inMemoryFolderRepository = new InMemoryFolderRepository();
    const inMemoryFileRepository = new InMemoryFileRepository();
    await inMemoryFolderRepository.add(rootFolder);

    await synchronizeDirectoryMetadata({
      folder: rootFolder,
      folderRepository: inMemoryFolderRepository,
      fileRepository: inMemoryFileRepository,
    });

    expect(await inMemoryFolderRepository.searchById(rootFolder.id)).toMatchObject({
      id: rootFolder.id,
      path: '/',
    });
  });

  it('should preserve /.Trash folder when refreshing root children', async () => {
    const rootFolder = FolderMother.root();
    const trashFolder = FolderMother.fromPartial({
      id: Number.MAX_SAFE_INTEGER,
      path: '/.Trash',
      parentId: rootFolder.id,
    });
    const inMemoryFolderRepository = new InMemoryFolderRepository();
    const inMemoryFileRepository = new InMemoryFileRepository();
    await inMemoryFolderRepository.add(rootFolder);
    await inMemoryFolderRepository.add(trashFolder);

    await synchronizeDirectoryMetadata({
      folder: rootFolder,
      folderRepository: inMemoryFolderRepository,
      fileRepository: inMemoryFileRepository,
    });

    expect(await inMemoryFolderRepository.searchById(trashFolder.id)).toBeDefined();
  });

  it('should mark the directory as errored without mutating cached children when folder persistence fails', async () => {
    createOrUpdateFolderByBatchMock.mockResolvedValue({ error: new Error('database failure') });

    await expect(synchronizeDirectoryMetadata({ folder, folderRepository, fileRepository })).rejects.toMatchObject({
      code: FuseCodes.EIO,
    });

    expect(createOrUpdateFileByBatchMock).not.toHaveBeenCalled();
    expect(fileRepository.deleteByFolderPath).not.toHaveBeenCalled();
    expect(markLoadedMock).not.toHaveBeenCalled();
    expect(markErrorMock).toHaveBeenCalledWith({ folderId: folder.id, statusScope: 'EXISTS' });
  });

  it('should mark the directory as errored without mutating cached children when file persistence fails', async () => {
    createOrUpdateFileByBatchMock.mockResolvedValue({ error: new Error('database failure') });

    await expect(synchronizeDirectoryMetadata({ folder, folderRepository, fileRepository })).rejects.toMatchObject({
      code: FuseCodes.EIO,
    });

    expect(fileRepository.deleteByFolderPath).not.toHaveBeenCalled();
    expect(markLoadedMock).not.toHaveBeenCalled();
    expect(markErrorMock).toHaveBeenCalledWith({ folderId: folder.id, statusScope: 'EXISTS' });
  });
});
