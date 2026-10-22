import { Result } from '@internxt/drive-desktop-core/build/common/result';
import { mockDeep } from 'vitest-mock-extended';
import { call, partialSpyOn } from 'tests/vitest/utils.helper';
import { FuseCodes } from '../../../../../../apps/drive/fuse/callbacks/FuseCodes';
import { FolderRepository } from '../../../../../../context/virtual-drive/folders/domain/FolderRepository';
import { FileRepository } from '../../../../../../context/virtual-drive/files/domain/FileRepository';
import { TRASH_FOLDER_ID, TRASH_UID_FOLDER_ID } from '../../drive-folder/constants';
import { FolderMother } from '../../../../../../context/virtual-drive/folders/domain/__test-helpers__/FolderMother';
import { FileMother } from '../../../../../../context/virtual-drive/files/domain/__test-helpers__/FileMother';
import { DirectoryStateRepository } from '../directory-state-sqlite-repository';
import { DirectoryMetadataSyncError } from '../directory-metadata-sync.error';
import * as resolution from './resolve-folder';
import * as synchronization from './synchronize-children-if-stale';
import { readDirectory } from './read-directory';

describe('read-directory', () => {
  const resolveMock = partialSpyOn(resolution, 'resolveFolder');
  const synchronizeMock = partialSpyOn(synchronization, 'synchronizeChildrenIfStale');
  const stateMock = partialSpyOn(DirectoryStateRepository, 'getState');
  const folder = FolderMother.root();
  const folderRepository = mockDeep<FolderRepository>();
  const fileRepository = mockDeep<FileRepository>();
  const props = { path: '/', folderRepository, fileRepository };

  beforeEach(() => {
    resolveMock.mockResolvedValue(Result.ok(folder));
    synchronizeMock.mockResolvedValue(Result.ok(undefined));
    stateMock.mockResolvedValue(undefined);
    folderRepository.matchingPartial.mockReturnValue([]);
    fileRepository.matchingPartial.mockReturnValue([]);
  });

  it('should list direct existing folder and file names', async () => {
    const child = FolderMother.fromPartial({ path: '/documents' });
    const file = FileMother.fromPartial({ path: '/report.txt' });
    folderRepository.matchingPartial.mockReturnValue([child]);
    fileRepository.matchingPartial.mockReturnValue([file]);

    expect(await readDirectory(props)).toStrictEqual({
      data: { folders: ['documents'], files: ['report.txt'] },
    });
    call(folderRepository.matchingPartial).toStrictEqual({ parentId: folder.id, status: 'EXISTS' });
    call(fileRepository.matchingPartial).toStrictEqual({ folderId: folder.id, status: 'EXISTS' });
  });

  it('should omit virtual trash folders from the listing', async () => {
    const child = FolderMother.fromPartial({ id: 10, path: '/documents' });
    const trash = FolderMother.fromPartial({ id: TRASH_FOLDER_ID, path: '/.Trash' });
    const trashUid = FolderMother.fromPartial({ id: TRASH_UID_FOLDER_ID, path: '/.Trash-1000' });
    folderRepository.matchingPartial.mockReturnValue([trash, child, trashUid]);

    expect(await readDirectory(props)).toStrictEqual({
      data: { folders: ['documents'], files: [] },
    });
  });

  it('should allow a successfully loaded empty cache after a safe failure', async () => {
    stateMock.mockResolvedValue({ children_loaded_at: new Date(0).toISOString() });
    synchronizeMock.mockResolvedValue(
      Result.err(new DirectoryMetadataSyncError({ code: FuseCodes.EIO, folderPath: '/', canUseCachedChildren: true })),
    );

    expect(await readDirectory(props)).toStrictEqual({ data: { folders: [], files: [] } });
  });

  it.each([
    { loaded: false, safe: true },
    { loaded: true, safe: false },
  ])('should return an error for an unavailable or unsafe cache: %j', async ({ loaded, safe }) => {
    stateMock.mockResolvedValue({ children_loaded_at: loaded ? new Date(0).toISOString() : null });
    const error = new DirectoryMetadataSyncError({
      code: FuseCodes.EIO,
      folderPath: '/',
      canUseCachedChildren: safe,
    });
    synchronizeMock.mockResolvedValue(Result.err(error));

    const result = await readDirectory(props);

    expect(result.error).toBe(error);
    expect(fileRepository.matchingPartial).not.toHaveBeenCalled();
  });

  it('should propagate unclassified refresh errors', async () => {
    const error = new Error('unexpected');
    synchronizeMock.mockResolvedValue(Result.err(error));

    const result = await readDirectory(props);

    expect(result.error).toBe(error);
    expect(stateMock).not.toHaveBeenCalled();
  });
});
