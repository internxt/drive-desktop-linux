import * as remoteSyncServiceModule from '../../../apps/main/remote-sync/service';
import * as findBackupPathnameFromIdModule from './find-backup-pathname-from-id';
import * as sumTotalModule from './sum-total-file-size-in-backup-subtree-sqlite';
import * as deleteBackupModule from './delete-backup';
import configStoreModule from '../../../apps/main/config';
import { createAbsolutePath } from '../../../context/local/localFile/infrastructure/AbsolutePath';
import { call, partialSpyOn } from '../../../../tests/vitest/utils.helper';
import { loggerMock } from '../../../../tests/vitest/mocks.helper';
import { disableBackup } from './disable-backup';

describe('disable-backup', () => {
  const findBackupPathnameFromIdMock = partialSpyOn(findBackupPathnameFromIdModule, 'findBackupPathnameFromId');
  const startRemoteSyncMock = partialSpyOn(remoteSyncServiceModule, 'startRemoteSync');
  const sumTotalFileSizeMock = partialSpyOn(sumTotalModule, 'sumTotalFileSizeInBackupSubtreeSqlite');
  const deleteBackupMock = partialSpyOn(deleteBackupModule, 'deleteBackup');
  const configStoreGetMock = partialSpyOn(configStoreModule, 'get');
  const configStoreSetMock = partialSpyOn(configStoreModule, 'set');

  const filesCollectionStub = { getAllWhere: vi.fn() };
  const foldersCollectionStub = { getAllWhere: vi.fn() };

  const backup = {
    folderUuid: 'folder-uuid',
    folderId: 1,
    tmpPath: '/tmp',
    backupsBucket: 'bucket',
    pathname: createAbsolutePath('/home/dev/Documents'),
    name: 'Documents',
  };

  it('should throw when backup pathname is not found', async () => {
    configStoreGetMock.mockReturnValue({});
    findBackupPathnameFromIdMock.mockReturnValue(undefined);

    await expect(
      disableBackup({
        backup,
        deps: { files: filesCollectionStub as never, folders: foldersCollectionStub as never },
      }),
    ).rejects.toBeUndefined();

    expect(configStoreSetMock).not.toBeCalled();
    expect(startRemoteSyncMock).not.toBeCalled();
    expect(filesCollectionStub.getAllWhere).not.toHaveBeenCalled();
    expect(foldersCollectionStub.getAllWhere).not.toHaveBeenCalled();
  });

  it('should disable backup and delete it when subtree file size is zero', async () => {
    const backupList = {
      '/home/dev/Documents': { folderId: 1, folderUuid: 'folder-uuid', enabled: true },
    };

    configStoreGetMock.mockReturnValue(backupList);
    findBackupPathnameFromIdMock.mockReturnValue('/home/dev/Documents');
    startRemoteSyncMock.mockResolvedValue(undefined);
    sumTotalFileSizeMock.mockResolvedValue(0);
    deleteBackupMock.mockResolvedValue({ data: true });

    await disableBackup({
      backup,
      deps: { files: filesCollectionStub as never, folders: foldersCollectionStub as never },
    });

    call(configStoreSetMock).toStrictEqual([
      'backupList',
      {
        '/home/dev/Documents': { folderId: 1, folderUuid: 'folder-uuid', enabled: false },
      },
    ]);
    call(deleteBackupMock).toStrictEqual({ backup, isCurrent: true });
  });

  it('should log error when reading backup size from local database fails', async () => {
    const error = new Error('sqlite failed');
    configStoreGetMock.mockReturnValue({
      '/home/dev/Documents': { folderId: 1, folderUuid: 'folder-uuid', enabled: true },
    });
    findBackupPathnameFromIdMock.mockReturnValue('/home/dev/Documents');
    startRemoteSyncMock.mockRejectedValue(error);

    await expect(
      disableBackup({
        backup,
        deps: { files: filesCollectionStub as never, folders: foldersCollectionStub as never },
      }),
    ).rejects.toBeUndefined();

    call(loggerMock.error).toMatchObject({
      tag: 'BACKUPS',
      msg: 'Error reading backup size from local database after disable',
    });
  });
});
