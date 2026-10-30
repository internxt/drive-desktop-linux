import { mockDeep } from 'vitest-mock-extended';
import { partialSpyOn } from 'tests/vitest/utils.helper';

import { FileRepository } from '../../../context/virtual-drive/files/domain/FileRepository';
import { FolderRepository } from '../../../context/virtual-drive/folders/domain/FolderRepository';
import { FolderMother } from '../../../context/virtual-drive/folders/domain/__test-helpers__/FolderMother';
import * as fetchFolderModule from '../../../infra/drive-server/services/folder/services/fetch-folder';
import * as createOrUpdateFileModule from '../../../infra/sqlite/services/file/create-or-update-file-by-batch';
import * as createOrUpdateFolderModule from '../../../infra/sqlite/services/folder/create-or-update-folder-by-batch';
import { DirectoryStateRepository } from '../virtual-drive/services/lazy/directory-state-sqlite-repository';
import { synchronizeDirectoryMetadata } from '../virtual-drive/services/lazy/synchronize-directory-metadata';
import { persistFilesSyncBatch } from './persist-files-sync-batch';
import { persistFoldersSyncBatch } from './persist-folders-sync-batch';
import type { FileSyncDto, FolderSyncDto } from './types';

describe('directory-metadata-write-coordination', () => {
  const fetchFolderMock = partialSpyOn(fetchFolderModule, 'fetchFolder');
  const createOrUpdateFileMock = partialSpyOn(createOrUpdateFileModule, 'createOrUpdateFileByBatch');
  const createOrUpdateFolderMock = partialSpyOn(createOrUpdateFolderModule, 'createOrUpdateFolderByBatch');
  const getFreshDirectoryStatesMock = partialSpyOn(DirectoryStateRepository, 'getFreshDirectoryStates');
  const invalidateMock = partialSpyOn(DirectoryStateRepository, 'invalidate');
  const markLoadedMock = partialSpyOn(DirectoryStateRepository, 'markLoaded');
  const markErrorMock = partialSpyOn(DirectoryStateRepository, 'markError');

  const folder = FolderMother.root();
  const loadedAt = new Date('2026-06-01T12:00:00.000Z');
  const folderRepository = mockDeep<FolderRepository>();
  const fileRepository = mockDeep<FileRepository>();

  function deferred() {
    let resolve: () => void = () => undefined;
    const promise = new Promise<void>((done) => {
      resolve = done;
    });
    return { promise, resolve };
  }

  beforeEach(() => {
    folderRepository.matchingPartial.mockReturnValue([]);
    folderRepository.searchByPathPrefix.mockReturnValue([]);
    folderRepository.add.mockResolvedValue(undefined);
    fileRepository.matchingPartial.mockReturnValue([]);
    fileRepository.upsert.mockResolvedValue(false);
    fileRepository.delete.mockResolvedValue(undefined);
    fileRepository.deleteByFolderPath.mockResolvedValue(undefined);
    fetchFolderMock.mockResolvedValue({ data: { children: [], files: [] } });
    createOrUpdateFileMock.mockResolvedValue({ data: [] });
    createOrUpdateFolderMock.mockResolvedValue({ data: [] });
    invalidateMock.mockResolvedValue(undefined);
    markErrorMock.mockResolvedValue(undefined);
    getFreshDirectoryStatesMock.mockResolvedValue(new Map());
  });

  it('should snapshot files only after an in-flight directory refresh marks the directory loaded', async () => {
    const events: string[] = [];
    const gate = deferred();
    markLoadedMock.mockImplementation(async () => {
      events.push('mark-loaded');
      await gate.promise;
    });
    getFreshDirectoryStatesMock.mockImplementation(async () => {
      events.push('snapshot');
      if (!events.includes('mark-loaded')) return new Map();
      return new Map([[folder.uuid, loadedAt]]);
    });
    createOrUpdateFileMock.mockImplementation(async ({ files }) => {
      events.push(files?.some((file) => file?.uuid === 'stale-file') ? 'write-stale-file' : 'write-files');
      return { data: [] };
    });
    const refresh = synchronizeDirectoryMetadata({ folder, folderRepository, fileRepository });

    await vi.waitFor(() => {
      expect(events).toContain('mark-loaded');
    });
    const persist = persistFilesSyncBatch({ items: [staleFile({ folderUuid: folder.uuid })] });
    await Promise.resolve();

    expect(events).toStrictEqual(['write-files', 'mark-loaded']);

    gate.resolve();
    await Promise.all([refresh, persist]);

    expect(events).toStrictEqual(['write-files', 'mark-loaded', 'snapshot', 'write-files']);
  });

  it('should snapshot folders only after an in-flight directory refresh marks the directory loaded', async () => {
    const events: string[] = [];
    const gate = deferred();
    markLoadedMock.mockImplementation(async () => {
      events.push('mark-loaded');
      await gate.promise;
    });
    getFreshDirectoryStatesMock.mockImplementation(async () => {
      events.push('snapshot');
      if (!events.includes('mark-loaded')) return new Map();
      return new Map([[folder.uuid, loadedAt]]);
    });
    createOrUpdateFolderMock.mockImplementation(async ({ folders }) => {
      events.push(folders?.some((entry) => entry?.uuid === 'stale-folder') ? 'write-stale-folder' : 'write-folders');
      return { data: [] };
    });
    const refresh = synchronizeDirectoryMetadata({ folder, folderRepository, fileRepository });

    await vi.waitFor(() => {
      expect(events).toContain('mark-loaded');
    });
    const persist = persistFoldersSyncBatch({ items: [staleFolder({ parentUuid: folder.uuid })] });
    await Promise.resolve();

    expect(events).toStrictEqual(['write-folders', 'mark-loaded']);

    gate.resolve();
    await Promise.all([refresh, persist]);

    expect(events).toStrictEqual(['write-folders', 'mark-loaded', 'snapshot', 'write-folders']);
  });
});

function staleFile({ folderUuid }: { folderUuid: string }): FileSyncDto {
  return {
    id: 1,
    uuid: 'stale-file',
    name: 'Stale',
    type: 'txt',
    size: '10',
    bucket: 'bucket',
    fileId: 'file-id',
    folderId: 0,
    folderUuid,
    encryptVersion: '',
    userId: 1,
    creationTime: '',
    modificationTime: '2026-06-01T11:00:00.000Z',
    createdAt: '2026-06-01T11:00:00.000Z',
    updatedAt: '2026-06-01T11:00:00.000Z',
    plainName: 'Stale',
    status: 'EXISTS',
  };
}

function staleFolder({ parentUuid }: { parentUuid: string }): FolderSyncDto {
  return {
    id: 9,
    uuid: 'stale-folder',
    name: 'Stale folder',
    type: 'folder',
    bucket: 'bucket',
    createdAt: '2026-06-01T11:00:00.000Z',
    updatedAt: '2026-06-01T11:00:00.000Z',
    plainName: 'Stale folder',
    size: 0,
    creationTime: '',
    modificationTime: '2026-06-01T11:00:00.000Z',
    status: 'EXISTS',
    removed: false,
    deleted: false,
    parentId: 0,
    parentUuid,
    parent: {},
    userId: 1,
    encryptVersion: '',
  };
}
