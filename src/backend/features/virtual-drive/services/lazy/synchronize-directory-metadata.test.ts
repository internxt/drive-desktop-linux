import { mockDeep } from 'vitest-mock-extended';
import { FolderRepository } from '../../../../../context/virtual-drive/folders/domain/FolderRepository';
import { FileRepository } from '../../../../../context/virtual-drive/files/domain/FileRepository';
import { FolderMother } from '../../../../../context/virtual-drive/folders/domain/__test-helpers__/FolderMother';
import { InMemoryFolderRepository } from '../../../../../context/virtual-drive/folders/infrastructure/InMemoryFolderRepository';
import { InMemoryFileRepository } from '../../../../../context/virtual-drive/files/infrastructure/InMemoryFileRepository';
import { FuseCodes } from '../../../../../apps/drive/fuse/callbacks/FuseCodes';
import { DriveServerError } from '../../../../../infra/drive-server/drive-server.error';
import { synchronizeDirectoryMetadata } from './synchronize-directory-metadata';
import { LazyVirtualDriveMetadataSynchronizer } from './lazy-virtual-drive-metadata-synchronizer';
import { DIRECTORY_STATE_ERROR_COOLDOWN_MS } from './constants';
import { DirectoryStateRow } from './types';

const {
  fetchFolderMock,
  createOrUpdateFolderByBatchMock,
  createOrUpdateFileByBatchMock,
  markLoadedMock,
  markErrorMock,
  invalidateMock,
  getStateMock,
  isFreshMock,
} = vi.hoisted(() => ({
  fetchFolderMock: vi.fn(),
  createOrUpdateFolderByBatchMock: vi.fn(),
  createOrUpdateFileByBatchMock: vi.fn(),
  markLoadedMock: vi.fn(),
  markErrorMock: vi.fn(),
  invalidateMock: vi.fn(),
  getStateMock: vi.fn(),
  isFreshMock: vi.fn(),
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
    getState: getStateMock,
    isFresh: isFreshMock,
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

    expect(markErrorMock).toHaveBeenCalledWith({
      folderId: folder.id,
      statusScope: 'EXISTS',
      failureState: 'error_before_mutation',
    });
    expect(invalidateMock).not.toHaveBeenCalled();
    expect(createOrUpdateFolderByBatchMock).not.toHaveBeenCalled();
  });

  it('should return ENOENT when the directory no longer exists remotely', async () => {
    fetchFolderMock.mockResolvedValue({ error: new DriveServerError('NOT_FOUND') });

    await expect(synchronizeDirectoryMetadata({ folder, folderRepository, fileRepository })).rejects.toMatchObject({
      code: FuseCodes.ENOENT,
    });

    expect(markErrorMock).toHaveBeenCalledWith({
      folderId: folder.id,
      statusScope: 'EXISTS',
      failureState: 'error_not_found',
    });
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

  it('should mark the directory as errored without mutating cached children when folder persistence fails', async () => {
    createOrUpdateFolderByBatchMock.mockResolvedValue({ error: new Error('database failure') });

    await expect(synchronizeDirectoryMetadata({ folder, folderRepository, fileRepository })).rejects.toMatchObject({
      code: FuseCodes.EIO,
    });

    expect(createOrUpdateFileByBatchMock).not.toHaveBeenCalled();
    expect(fileRepository.deleteByFolderPath).not.toHaveBeenCalled();
    expect(markLoadedMock).not.toHaveBeenCalled();
    expect(markErrorMock).toHaveBeenCalledWith({ folderId: folder.id, statusScope: 'EXISTS', failureState: 'error' });
  });

  it('should mark the directory as errored without mutating cached children when file persistence fails', async () => {
    createOrUpdateFileByBatchMock.mockResolvedValue({ error: new Error('database failure') });

    await expect(synchronizeDirectoryMetadata({ folder, folderRepository, fileRepository })).rejects.toMatchObject({
      code: FuseCodes.EIO,
    });

    expect(fileRepository.deleteByFolderPath).not.toHaveBeenCalled();
    expect(markLoadedMock).not.toHaveBeenCalled();
    expect(markErrorMock).toHaveBeenCalledWith({ folderId: folder.id, statusScope: 'EXISTS', failureState: 'error' });
  });

  it.each(['folder', 'file', 'deletion', 'markLoaded'] as const)(
    'should forbid fallback after %s mutation has started',
    async (stage) => {
      if (stage === 'folder')
        createOrUpdateFolderByBatchMock.mockResolvedValue({ error: new Error('folder persistence') });
      if (stage === 'file') createOrUpdateFileByBatchMock.mockResolvedValue({ error: new Error('file persistence') });
      if (stage === 'deletion') fileRepository.deleteByFolderPath.mockRejectedValue(new Error('deletion'));
      if (stage === 'markLoaded') markLoadedMock.mockRejectedValue(new Error('state persistence'));

      await expect(synchronizeDirectoryMetadata({ folder, folderRepository, fileRepository })).rejects.toMatchObject({
        code: FuseCodes.EIO,
        canUseCachedChildren: false,
      });
      expect(invalidateMock).toHaveBeenCalledWith({ folderId: folder.id, statusScope: 'EXISTS' });
      expect(invalidateMock.mock.invocationCallOrder[0]).toBeLessThan(
        createOrUpdateFolderByBatchMock.mock.invocationCallOrder[0],
      );
    },
  );

  it.each([true, false])(
    'should reuse a successfully loaded listing after a fetch rejection (empty: %s)',
    async (empty) => {
      const state: DirectoryStateRow = {
        children_loaded_at: new Date(0).toISOString(),
        children_last_error_at: null,
        fetch_state: 'loaded',
      };
      getStateMock.mockResolvedValue(state);
      isFreshMock.mockResolvedValue(false);
      markErrorMock.mockImplementation(async ({ failureState }) => {
        state.children_last_error_at = new Date().toISOString();
        state.fetch_state = failureState;
      });
      const child = FolderMother.fromPartial({ id: 99, parentId: folder.id, path: '/documents' });
      folderRepository.matchingPartial.mockImplementation((partial) =>
        partial.path === '/' ? [folder] : partial.parentId === folder.id && !empty ? [child] : [],
      );
      fileRepository.matchingPartial.mockReturnValue([]);
      fetchFolderMock.mockRejectedValue(new Error('network failure'));
      const props = { path: '/', folderRepository, fileRepository };

      expect(await LazyVirtualDriveMetadataSynchronizer.readDirectory(props)).toStrictEqual({
        folders: empty ? [] : [child.name],
        files: [],
      });
      expect(await LazyVirtualDriveMetadataSynchronizer.readDirectory(props)).toStrictEqual({
        folders: empty ? [] : [child.name],
        files: [],
      });
      expect(fetchFolderMock).toHaveBeenCalledTimes(1);
      expect(invalidateMock).not.toHaveBeenCalled();
    },
  );

  it('should not reuse a partially refreshed listing after a subsequent fetch failure', async () => {
    const state: DirectoryStateRow = {
      children_loaded_at: new Date(0).toISOString(),
      children_last_error_at: null,
      fetch_state: 'loaded',
    };
    const now = Date.now();
    const clock = vi.spyOn(Date, 'now').mockReturnValue(now);
    getStateMock.mockResolvedValue(state);
    isFreshMock.mockResolvedValue(false);
    invalidateMock.mockImplementation(async () => {
      state.children_loaded_at = null;
    });
    markErrorMock.mockImplementation(async ({ failureState }) => {
      state.children_last_error_at = new Date(Date.now()).toISOString();
      state.fetch_state = failureState;
    });
    folderRepository.matchingPartial.mockReturnValue([folder]);
    createOrUpdateFileByBatchMock.mockResolvedValue({ error: new Error('partial persistence') });
    const props = { path: '/', folderRepository, fileRepository };

    await expect(LazyVirtualDriveMetadataSynchronizer.readDirectory(props)).rejects.toMatchObject({
      code: FuseCodes.EIO,
      canUseCachedChildren: false,
    });
    clock.mockReturnValue(now + DIRECTORY_STATE_ERROR_COOLDOWN_MS);
    fetchFolderMock.mockRejectedValue(new Error('network failure'));

    await expect(LazyVirtualDriveMetadataSynchronizer.readDirectory(props)).rejects.toMatchObject({
      code: FuseCodes.EIO,
    });
    expect(state.children_loaded_at).toBeNull();
    expect(fetchFolderMock).toHaveBeenCalledTimes(2);
    expect(fileRepository.matchingPartial).not.toHaveBeenCalled();
  });
});
