import { mockDeep } from 'vitest-mock-extended';
import { FolderRepository } from '../../../../../context/virtual-drive/folders/domain/FolderRepository';
import { FileRepository } from '../../../../../context/virtual-drive/files/domain/FileRepository';
import { FolderMother } from '../../../../../context/virtual-drive/folders/domain/__test-helpers__/FolderMother';
import { InMemoryFolderRepository } from '../../../../../context/virtual-drive/folders/infrastructure/InMemoryFolderRepository';
import { InMemoryFileRepository } from '../../../../../context/virtual-drive/files/infrastructure/InMemoryFileRepository';
import { FuseCodes } from '../../../../../apps/drive/fuse/callbacks/FuseCodes';
import { DriveServerError } from '../../../../../infra/drive-server/drive-server.error';
import { synchronizeDirectoryMetadata } from './synchronize-directory-metadata';
import { readDirectory } from './metadata-synchronizer';
import { DIRECTORY_STATE_ERROR_COOLDOWN_MS } from './constants';
import { DirectoryStateRow } from './types';
import { FileMother } from '../../../../../context/virtual-drive/files/domain/__test-helpers__/FileMother';

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
    folderRepository.matchingPartial.mockReturnValue([]);
    folderRepository.searchByPathPrefix.mockReturnValue([]);
    folderRepository.add.mockResolvedValue(undefined);
    fileRepository.deleteByFolderPath.mockResolvedValue(undefined);
    fileRepository.upsert.mockResolvedValue(false);
    fileRepository.matchingPartial.mockReturnValue([]);
    fileRepository.delete.mockResolvedValue(undefined);
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
    expect(fileRepository.deleteByFolderPath).not.toHaveBeenCalled();
    expect(markLoadedMock).toHaveBeenCalledWith({ folderUuid: folder.uuid, statusScope: 'EXISTS' });
    expect(markErrorMock).not.toHaveBeenCalled();
  });

  it('should mark the directory as errored and return EIO when fetching fails', async () => {
    fetchFolderMock.mockResolvedValue({ error: new Error('network failure') });

    const result = await synchronizeDirectoryMetadata({ folder, folderRepository, fileRepository });

    expect(result.error).toMatchObject({
      code: FuseCodes.EIO,
    });

    expect(markErrorMock).toHaveBeenCalledWith({
      folderUuid: folder.uuid,
      statusScope: 'EXISTS',
      failureState: 'error_before_mutation',
    });
    expect(invalidateMock).not.toHaveBeenCalled();
    expect(createOrUpdateFolderByBatchMock).not.toHaveBeenCalled();
  });

  it('should return ENOENT when the directory no longer exists remotely', async () => {
    fetchFolderMock.mockResolvedValue({ error: new DriveServerError('NOT_FOUND') });

    const result = await synchronizeDirectoryMetadata({ folder, folderRepository, fileRepository });

    expect(result.error).toMatchObject({
      code: FuseCodes.ENOENT,
    });

    expect(markErrorMock).toHaveBeenCalledWith({
      folderUuid: folder.uuid,
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

    expect(await inMemoryFolderRepository.searchByUuid(rootFolder.uuid)).toMatchObject({
      uuid: rootFolder.uuid,
      path: '/',
    });
  });

  it.each(['/', '/documents'])('should retain valid descendants and only remove stale children of %s', async (path) => {
    const parent = FolderMother.fromPartial({ path });
    const prefix = path === '/' ? '' : path;
    const kept = FolderMother.fromPartial({ parentUuid: parent.uuid, path: `${prefix}/kept` });
    const descendant = FolderMother.fromPartial({
      parentUuid: kept.uuid,
      path: `${kept.path}/nested`,
    });
    const removed = FolderMother.fromPartial({
      parentUuid: parent.uuid,
      path: `${prefix}/gone`,
    });
    const removedDescendant = FolderMother.fromPartial({
      parentUuid: removed.uuid,
      path: `${removed.path}/nested`,
    });
    const sibling = FolderMother.fromPartial({
      parentUuid: parent.uuid,
      path: `${prefix}/gone-too`,
    });
    const directFile = FileMother.fromPartial({
      folderUuid: parent.uuid,
      path: `${prefix}/keep.txt`,
      size: 1,
    });
    const staleFile = FileMother.fromPartial({ folderUuid: parent.uuid, path: `${prefix}/stale.txt` });
    const nestedFile = FileMother.fromPartial({
      folderUuid: descendant.uuid,
      path: `${descendant.path}/keep.txt`,
    });
    const removedFile = FileMother.fromPartial({
      folderUuid: removed.uuid,
      path: `${removed.path}/remove.txt`,
    });
    const removedNestedFile = FileMother.fromPartial({
      folderUuid: removedDescendant.uuid,
      path: `${removedDescendant.path}/remove.txt`,
    });
    const siblingFile = FileMother.fromPartial({
      folderUuid: sibling.uuid,
      path: `${sibling.path}/keep.txt`,
    });
    const folders = new InMemoryFolderRepository();
    const files = new InMemoryFileRepository();
    for (const entry of [parent, kept, descendant, removed, removedDescendant, sibling]) await folders.add(entry);
    for (const entry of [directFile, staleFile, nestedFile, removedFile, removedNestedFile, siblingFile])
      await files.upsert(entry);
    fetchFolderMock.mockResolvedValue({
      data: {
        children: [kept, sibling].map((entry) => ({
          ...entry.attributes(),
          plainName: entry.name,
          deleted: false,
          removed: false,
          updatedAt: '2026-01-01T00:00:00.000Z',
        })),
        files: [
          {
            ...directFile.attributes(),
            plainName: 'keep',
            type: 'txt',
            fileId: directFile.contentsId,
            size: '42',
          },
        ],
      },
    });

    await synchronizeDirectoryMetadata({ folder: parent, folderRepository: folders, fileRepository: files });

    expect((await folders.all()).map((entry) => entry.uuid).sort()).toStrictEqual(
      [parent, kept, descendant, sibling].map((entry) => entry.uuid).sort(),
    );
    expect((await folders.searchByUuid(sibling.uuid))?.attributes()).toMatchObject({
      uuid: sibling.uuid,
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
    expect((await files.all()).map((entry) => entry.uuid).sort()).toStrictEqual(
      [directFile, nestedFile, siblingFile].map((entry) => entry.uuid).sort(),
    );
    expect(await files.searchByUuid(directFile.uuid)).toMatchObject({ size: 42 });
    expect(await files.searchByContentsId(staleFile.contentsId)).toBeUndefined();
    expect(await files.searchByContentsId(removedNestedFile.contentsId)).toBeUndefined();
    expect(invalidateMock.mock.calls.map(([props]) => props.folderUuid).sort()).toStrictEqual(
      [parent.uuid, removed.uuid, removedDescendant.uuid].sort(),
    );
  });

  it('should drop cached descendants when a remote folder keeps its uuid and changes path', async () => {
    const parent = FolderMother.fromPartial({ path: '/documents' });
    const renamed = FolderMother.fromPartial({
      parentUuid: parent.uuid,
      path: '/documents/old',
    });
    const descendant = FolderMother.fromPartial({
      parentUuid: renamed.uuid,
      path: '/documents/old/nested',
    });
    const nestedFile = FileMother.fromPartial({
      folderUuid: descendant.uuid,
      path: '/documents/old/nested/keep.txt',
    });
    const folders = new InMemoryFolderRepository();
    const files = new InMemoryFileRepository();
    for (const entry of [parent, renamed, descendant]) await folders.add(entry);
    await files.upsert(nestedFile);
    fetchFolderMock.mockResolvedValue({
      data: {
        children: [
          {
            ...renamed.attributes(),
            plainName: 'new',
            deleted: false,
            removed: false,
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
        ],
        files: [],
      },
    });

    await synchronizeDirectoryMetadata({ folder: parent, folderRepository: folders, fileRepository: files });

    expect((await folders.searchByUuid(renamed.uuid))?.path).toBe('/documents/new');
    expect(await folders.searchByUuid(descendant.uuid)).toBeUndefined();
    expect(await files.searchByUuid(nestedFile.uuid)).toBeUndefined();
    expect(invalidateMock.mock.calls.map(([props]) => props.folderUuid).sort()).toStrictEqual(
      [parent.uuid, renamed.uuid, descendant.uuid].sort(),
    );
  });

  it('should preserve /.Trash folder when refreshing root children', async () => {
    const rootFolder = FolderMother.root();
    const trashFolder = FolderMother.fromPartial({
      path: '/.Trash',
      parentUuid: rootFolder.uuid,
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

    expect(await inMemoryFolderRepository.searchByUuid(trashFolder.uuid)).toBeDefined();
  });

  it('should mark the directory as errored without mutating cached children when folder persistence fails', async () => {
    createOrUpdateFolderByBatchMock.mockResolvedValue({ error: new Error('database failure') });

    const result = await synchronizeDirectoryMetadata({ folder, folderRepository, fileRepository });

    expect(result.error).toMatchObject({
      code: FuseCodes.EIO,
    });

    expect(createOrUpdateFileByBatchMock).not.toHaveBeenCalled();
    expect(fileRepository.deleteByFolderPath).not.toHaveBeenCalled();
    expect(markLoadedMock).not.toHaveBeenCalled();
    expect(markErrorMock).toHaveBeenCalledWith({
      folderUuid: folder.uuid,
      statusScope: 'EXISTS',
      failureState: 'error',
    });
  });

  it('should mark the directory as errored without mutating cached children when file persistence fails', async () => {
    createOrUpdateFileByBatchMock.mockResolvedValue({ error: new Error('database failure') });

    const result = await synchronizeDirectoryMetadata({ folder, folderRepository, fileRepository });

    expect(result.error).toMatchObject({
      code: FuseCodes.EIO,
    });

    expect(fileRepository.deleteByFolderPath).not.toHaveBeenCalled();
    expect(markLoadedMock).not.toHaveBeenCalled();
    expect(markErrorMock).toHaveBeenCalledWith({
      folderUuid: folder.uuid,
      statusScope: 'EXISTS',
      failureState: 'error',
    });
  });

  it.each(['folder', 'file', 'deletion', 'markLoaded'] as const)(
    'should forbid fallback after %s mutation has started',
    async (stage) => {
      if (stage === 'folder')
        createOrUpdateFolderByBatchMock.mockResolvedValue({ error: new Error('folder persistence') });
      if (stage === 'file') createOrUpdateFileByBatchMock.mockResolvedValue({ error: new Error('file persistence') });
      if (stage === 'deletion') {
        fileRepository.matchingPartial.mockReturnValue([FileMother.fromPartial({ folderUuid: folder.uuid })]);
        fileRepository.delete.mockRejectedValue(new Error('deletion'));
      }
      if (stage === 'markLoaded') markLoadedMock.mockRejectedValue(new Error('state persistence'));

      const result = await synchronizeDirectoryMetadata({ folder, folderRepository, fileRepository });

      expect(result.error).toMatchObject({
        code: FuseCodes.EIO,
        canUseCachedChildren: false,
      });
      expect(invalidateMock).toHaveBeenCalledWith({ folderUuid: folder.uuid, statusScope: 'EXISTS' });
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
      const child = FolderMother.fromPartial({
        parentUuid: folder.uuid,
        path: '/documents',
      });
      folderRepository.matchingPartial.mockImplementation((partial) =>
        partial.path === '/' ? [folder] : partial.parentUuid === folder.uuid && !empty ? [child] : [],
      );
      fileRepository.matchingPartial.mockReturnValue([]);
      fetchFolderMock.mockRejectedValue(new Error('network failure'));
      const props = { path: '/', folderRepository, fileRepository };

      expect(await readDirectory(props)).toStrictEqual({
        data: {
          folders: empty ? [] : [child.name],
          files: [],
        },
      });
      expect(await readDirectory(props)).toStrictEqual({
        data: {
          folders: empty ? [] : [child.name],
          files: [],
        },
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

    const failedRefresh = await readDirectory(props);

    expect(failedRefresh.error).toMatchObject({
      code: FuseCodes.EIO,
      canUseCachedChildren: false,
    });
    clock.mockReturnValue(now + DIRECTORY_STATE_ERROR_COOLDOWN_MS);
    fetchFolderMock.mockRejectedValue(new Error('network failure'));

    const failedFetch = await readDirectory(props);

    expect(failedFetch.error).toMatchObject({
      code: FuseCodes.EIO,
    });
    expect(state.children_loaded_at).toBeNull();
    expect(fetchFolderMock).toHaveBeenCalledTimes(2);
    expect(fileRepository.matchingPartial).not.toHaveBeenCalled();
  });
});
