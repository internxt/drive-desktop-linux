import { mockDeep } from 'vitest-mock-extended';
import { Container } from 'diod';
import { FuseCodes } from '../../../../../apps/drive/fuse/callbacks/FuseCodes';
import { FolderDeleter } from '../../../../../context/virtual-drive/folders/application/FolderDeleter';
import { SingleFolderMatchingFinder } from '../../../../../context/virtual-drive/folders/application/SingleFolderMatchingFinder';
import { Folder } from '../../../../../context/virtual-drive/folders/domain/Folder';
import { DriveItemStatus } from '@internxt/drive-desktop-core/build/backend';
import { SyncFolderMessenger } from '../../../../../context/virtual-drive/folders/domain/SyncFolderMessenger';
import { FolderNotFoundError } from '../../../../../context/virtual-drive/folders/domain/errors/FolderNotFoundError';
import { TemporalFileByFolderFinder } from '../../../../../context/storage/TemporalFiles/application/find/TemporalFileByFolderFinder';
import type { TemporalFile } from '../../../../../context/storage/TemporalFiles/domain/TemporalFile';
import { rmdir } from './rmdir.service';

vi.mock('@internxt/drive-desktop-core/build/backend');

describe('rmdir', () => {
  let container: ReturnType<typeof mockDeep<Container>>;
  const folderFinder = mockDeep<SingleFolderMatchingFinder>();
  const folderDeleter = mockDeep<FolderDeleter>();
  const syncFolderMessenger = mockDeep<SyncFolderMessenger>();
  const temporalFinder = mockDeep<TemporalFileByFolderFinder>();

  beforeEach(() => {
    container = mockDeep<Container>();

    container.get.calledWith(SingleFolderMatchingFinder).mockReturnValue(folderFinder);
    container.get.calledWith(FolderDeleter).mockReturnValue(folderDeleter);
    container.get.calledWith(SyncFolderMessenger).mockReturnValue(syncFolderMessenger);
    container.get.calledWith(TemporalFileByFolderFinder).mockReturnValue(temporalFinder);
    temporalFinder.run.mockResolvedValue([]);
  });

  it('should trash folder when folder exists', async () => {
    folderFinder.run.mockResolvedValue(
      Folder.from({
        uuid: '550e8400-e29b-41d4-a716-446655440010',
        path: '/some/folder',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: DriveItemStatus.EXISTS,
      }),
    );

    const { data, error } = await rmdir('/some/folder', container);

    expect(error).toBeUndefined();
    expect(data).toBeUndefined();
    expect(folderDeleter.run).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440010');
    expect(syncFolderMessenger.issue).not.toHaveBeenCalled();
  });

  it('should refuse to trash a folder that still has files being uploaded', async () => {
    temporalFinder.run.mockResolvedValue([mockDeep<TemporalFile>()]);

    const { data, error } = await rmdir('/Pics/.strata-replacement-gKlrIt', container);

    expect(data).toBeUndefined();
    expect(error?.code).toBe(FuseCodes.ENOTEMPTY);
    expect(folderDeleter.run).not.toHaveBeenCalled();
    expect(syncFolderMessenger.issue).not.toHaveBeenCalled();
  });

  it('should return ENOENT when folder is not found', async () => {
    folderFinder.run.mockRejectedValue(new FolderNotFoundError('/missing/folder'));

    const { data, error } = await rmdir('/missing/folder', container);

    expect(data).toBeUndefined();
    expect(error?.code).toBe(FuseCodes.ENOENT);
    expect(syncFolderMessenger.issue).toHaveBeenCalledWith({
      error: 'FOLDER_TRASH_ERROR',
      cause: 'UNKNOWN',
      name: 'folder',
    });
  });

  it('should return EIO when trash fails', async () => {
    folderFinder.run.mockResolvedValue(
      Folder.from({
        uuid: '550e8400-e29b-41d4-a716-446655440011',
        path: '/some/folder',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: DriveItemStatus.EXISTS,
      }),
    );
    folderDeleter.run.mockRejectedValue(new Error('boom'));

    const { data, error } = await rmdir('/some/folder', container);

    expect(data).toBeUndefined();
    expect(error?.code).toBe(FuseCodes.EIO);
    expect(syncFolderMessenger.issue).toHaveBeenCalledWith({
      error: 'FOLDER_TRASH_ERROR',
      cause: 'UNKNOWN',
      name: 'folder',
    });
  });
});
