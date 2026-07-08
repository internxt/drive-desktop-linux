import { describe, expect, it, vi } from 'vitest';
import { FuseCodes } from '../../../../../../apps/drive/fuse/callbacks/FuseCodes';
import type { FileRepository } from '../../../../../../context/virtual-drive/files/domain/FileRepository';
import type { Folder } from '../../../../../../context/virtual-drive/folders/domain/Folder';
import type { FolderRepository } from '../../../../../../context/virtual-drive/folders/domain/FolderRepository';
import { fetchAndStoreChildren } from './fetch-and-store-children';
import type { DirectoryStateSqliteRepository } from '../DirectoryStateSqliteRepository';

vi.mock('../../../../../../infra/drive-server/services/folder/services/fetch-folder', () => ({
  fetchFolder: vi.fn(),
}));

vi.mock('../../../../../../infra/sqlite/services/folder/create-or-update-folder-by-batch', () => ({
  createOrUpdateFolderByBatch: vi.fn(),
}));

vi.mock('../../../../../../infra/sqlite/services/file/create-or-update-file-by-batch', () => ({
  createOrUpdateFileByBatch: vi.fn(),
}));

vi.mock('./children', () => ({
  toRemoteFolders: vi.fn(() => [{ id: 1 }]),
  toRemoteFiles: vi.fn(() => [{ id: 2 }]),
  createLocalFolders: vi.fn(() => [{ id: 3 }]),
  createLocalFiles: vi.fn(() => [{ id: 4 }]),
}));

import { fetchFolder } from '../../../../../../infra/drive-server/services/folder/services/fetch-folder';
import { createOrUpdateFolderByBatch } from '../../../../../../infra/sqlite/services/folder/create-or-update-folder-by-batch';
import { createOrUpdateFileByBatch } from '../../../../../../infra/sqlite/services/file/create-or-update-file-by-batch';

describe('fetch-and-store-children', () => {
  it('should store children and mark the state as loaded', async () => {
    const folder = { id: 10, uuid: 'folder-uuid', path: '/docs' } as unknown as Folder;
    const addFolder = vi.fn();
    const deleteMatchingFolderPartial = vi.fn();
    const upsertFile = vi.fn();
    const deleteMatchingFilePartial = vi.fn();
    const markLoaded = vi.fn();
    const markError = vi.fn();

    const folderRepository = {
      deleteMatchingPartial: deleteMatchingFolderPartial,
      add: addFolder,
    } as unknown as FolderRepository;
    const fileRepository = {
      deleteMatchingPartial: deleteMatchingFilePartial,
      upsert: upsertFile,
    } as unknown as FileRepository;
    const directoryStateRepository = {
      markLoaded,
      markError,
    } as unknown as DirectoryStateSqliteRepository;

    vi.mocked(fetchFolder).mockResolvedValue({
      data: {
        children: [],
        files: [],
      },
      error: undefined,
    } as never);

    vi.mocked(createOrUpdateFolderByBatch).mockResolvedValue({ data: [] } as never);
    vi.mocked(createOrUpdateFileByBatch).mockResolvedValue({ data: [] } as never);

    await fetchAndStoreChildren({
      folder,
      statusScope: 'EXISTS',
      folderRepository,
      fileRepository,
      directoryStateRepository,
    });

    expect(addFolder).toHaveBeenCalledTimes(1);
    expect(upsertFile).toHaveBeenCalledTimes(1);
    expect(deleteMatchingFolderPartial).toHaveBeenCalledWith({ parentId: 10 });
    expect(deleteMatchingFilePartial).toHaveBeenCalledWith({ folderId: 10 });
    expect(deleteMatchingFolderPartial.mock.invocationCallOrder[0]).toBeLessThan(addFolder.mock.invocationCallOrder[0]);
    expect(deleteMatchingFilePartial.mock.invocationCallOrder[0]).toBeLessThan(upsertFile.mock.invocationCallOrder[0]);
    expect(markLoaded).toHaveBeenCalledWith({ folderId: 10, statusScope: 'EXISTS' });
    expect(markError).not.toHaveBeenCalled();
  });

  it('should mark the state as error when fetch fails', async () => {
    const folder = { id: 10, uuid: 'folder-uuid', path: '/docs' } as unknown as Folder;
    const markLoaded = vi.fn();
    const markError = vi.fn();
    const folderRepository = {
      deleteMatchingPartial: vi.fn(),
      add: vi.fn(),
    } as unknown as FolderRepository;
    const fileRepository = {
      deleteMatchingPartial: vi.fn(),
      upsert: vi.fn(),
    } as unknown as FileRepository;
    const directoryStateRepository = {
      markLoaded,
      markError,
    } as unknown as DirectoryStateSqliteRepository;

    vi.mocked(fetchFolder).mockResolvedValue({
      data: undefined,
      error: new Error('boom') as never,
    } as never);

    await expect(
      fetchAndStoreChildren({
        folder,
        statusScope: 'EXISTS',
        folderRepository,
        fileRepository,
        directoryStateRepository,
      }),
    ).rejects.toMatchObject({ code: FuseCodes.EIO });

    expect(markError).toHaveBeenCalledWith({ folderId: 10, statusScope: 'EXISTS' });
  });
});
