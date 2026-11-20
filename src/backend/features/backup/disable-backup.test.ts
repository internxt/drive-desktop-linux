import * as findBackupPathnameFromUuidModule from './find-backup-pathname-from-uuid';
import * as fetchFolderTotalSizeModule from '../../../infra/drive-server/services/folder/services/fetch-folder-total-size-bytes';
import * as remoteSyncServiceModule from '../../../apps/main/remote-sync/service';
import * as deleteBackupModule from './delete-backup';
import configStoreModule from '../../../apps/main/config';
import { DriveServerError } from '../../../infra/drive-server/drive-server.error';
import { createAbsolutePath } from '../../../context/local/localFile/infrastructure/AbsolutePath';
import { call, partialSpyOn } from '../../../../tests/vitest/utils.helper';
import { loggerMock } from '../../../../tests/vitest/mocks.helper';
import { disableBackup } from './disable-backup';

describe('disable-backup', () => {
  const findBackupPathnameFromUuidMock = partialSpyOn(findBackupPathnameFromUuidModule, 'findBackupPathnameFromUuid');
  const fetchFolderTotalSizeMock = partialSpyOn(fetchFolderTotalSizeModule, 'fetchFolderTotalSizeBytes');
  const startRemoteSyncMock = partialSpyOn(remoteSyncServiceModule, 'startRemoteSync');
  const deleteBackupMock = partialSpyOn(deleteBackupModule, 'deleteBackup');
  const configStoreGetMock = partialSpyOn(configStoreModule, 'get');
  const configStoreSetMock = partialSpyOn(configStoreModule, 'set');

  const backup = {
    folderUuid: 'folder-uuid',
    tmpPath: '/tmp',
    backupsBucket: 'bucket',
    pathname: createAbsolutePath('/home/dev/Documents'),
    name: 'Documents',
  };

  it('should throw when backup pathname is not found', async () => {
    configStoreGetMock.mockReturnValue({});
    findBackupPathnameFromUuidMock.mockReturnValue(undefined);

    await expect(disableBackup({ backup })).rejects.toBeUndefined();

    expect(configStoreSetMock).not.toBeCalled();
    expect(fetchFolderTotalSizeMock).not.toBeCalled();
    expect(startRemoteSyncMock).not.toBeCalled();
  });

  it('should disable backup and delete it when remote folder size is zero', async () => {
    const backupList = {
      '/home/dev/Documents': { folderUuid: 'folder-uuid', enabled: true },
    };

    configStoreGetMock.mockReturnValue(backupList);
    findBackupPathnameFromUuidMock.mockReturnValue('/home/dev/Documents');
    fetchFolderTotalSizeMock.mockResolvedValue({ data: 0 });
    deleteBackupMock.mockResolvedValue({ data: true });

    await disableBackup({ backup });

    call(configStoreSetMock).toStrictEqual([
      'backupList',
      {
        '/home/dev/Documents': { folderUuid: 'folder-uuid', enabled: false },
      },
    ]);
    call(fetchFolderTotalSizeMock).toBe('folder-uuid');
    call(deleteBackupMock).toStrictEqual({ backup, isCurrent: true });
    expect(startRemoteSyncMock).not.toBeCalled();
  });

  it('should keep the remote backup when it still has content', async () => {
    configStoreGetMock.mockReturnValue({
      '/home/dev/Documents': { folderUuid: 'folder-uuid', enabled: true },
    });
    findBackupPathnameFromUuidMock.mockReturnValue('/home/dev/Documents');
    fetchFolderTotalSizeMock.mockResolvedValue({ data: 128 });

    await disableBackup({ backup });

    expect(deleteBackupMock).not.toBeCalled();
    expect(startRemoteSyncMock).not.toBeCalled();
  });

  it('should preserve the backup when remote folder size cannot be read', async () => {
    configStoreGetMock.mockReturnValue({
      '/home/dev/Documents': { folderUuid: 'folder-uuid', enabled: true },
    });
    findBackupPathnameFromUuidMock.mockReturnValue('/home/dev/Documents');
    fetchFolderTotalSizeMock.mockResolvedValue({ error: new DriveServerError('SERVER_ERROR', 500, 'stats failed') });

    await disableBackup({ backup });

    expect(deleteBackupMock).not.toBeCalled();
    expect(startRemoteSyncMock).not.toBeCalled();
    call(loggerMock.error).toMatchObject({
      tag: 'BACKUPS',
      msg: 'Failed to read backup size from remote folder; backup preserved',
    });
  });
});
