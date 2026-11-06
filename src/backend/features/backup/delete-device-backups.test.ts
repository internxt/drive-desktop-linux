import * as addFolderToTrashModule from '../../../infra/drive-server/services/folder/services/add-folder-to-trash';
import * as remoteSyncServiceModule from '../../../apps/main/remote-sync/service';
import * as listOrphanModule from './list-orphan-folder-uuids-under-device-sqlite';
import * as deleteBackupModule from './delete-backup';
import * as DeviceModuleModule from '../device/device.module';
import { createAbsolutePath } from '../../../context/local/localFile/infrastructure/AbsolutePath';
import { calls, partialSpyOn } from '../../../../tests/vitest/utils.helper';
import { deleteDeviceBackups } from './delete-device-backups';

describe('delete-device-backups', () => {
  const getBackupsFromDeviceMock = partialSpyOn(DeviceModuleModule.DeviceModule, 'getBackupsFromDevice');
  const deleteBackupMock = partialSpyOn(deleteBackupModule, 'deleteBackup');
  const startRemoteSyncMock = partialSpyOn(remoteSyncServiceModule, 'startRemoteSync');
  const listOrphanUuidsMock = partialSpyOn(listOrphanModule, 'listOrphanFolderUuidsUnderDeviceSqlite');
  const addFolderToTrashMock = partialSpyOn(addFolderToTrashModule, 'addFolderToTrash');

  const foldersCollectionStub = { getAllWhere: vi.fn() };

  const device = {
    id: 1,
    uuid: 'device-uuid',
    name: 'Desktop',
    bucket: 'bucket',
    removed: false,
    hasBackups: true,
  };

  it('should delete each backup and trash only stale folders from device children', async () => {
    const backups = [
      {
        folderUuid: 'folder-uuid-1',
        folderId: 10,
        tmpPath: '/tmp',
        backupsBucket: 'bucket',
        pathname: createAbsolutePath('/home/dev/Documents'),
        name: 'Documents',
      },
    ];

    getBackupsFromDeviceMock.mockResolvedValue(backups);
    deleteBackupMock.mockResolvedValue({ data: true });
    startRemoteSyncMock.mockResolvedValue(undefined);
    listOrphanUuidsMock.mockResolvedValue(['folder-uuid-2']);
    addFolderToTrashMock.mockResolvedValue({ data: undefined as never });

    await deleteDeviceBackups({
      device,
      isCurrent: true,
      deps: { folders: foldersCollectionStub as never },
    });

    calls(deleteBackupMock).toStrictEqual([{ backup: backups[0], isCurrent: true }]);
    calls(addFolderToTrashMock).toStrictEqual(['folder-uuid-2']);
  });

  it('should not trash any folder when there are no orphan children', async () => {
    const backups = [
      {
        folderUuid: 'folder-uuid-1',
        folderId: 10,
        tmpPath: '/tmp',
        backupsBucket: 'bucket',
        pathname: createAbsolutePath('/home/dev/Documents'),
        name: 'Documents',
      },
    ];

    getBackupsFromDeviceMock.mockResolvedValue(backups);
    deleteBackupMock.mockResolvedValue({ data: true });
    startRemoteSyncMock.mockResolvedValue(undefined);
    listOrphanUuidsMock.mockResolvedValue([]);

    await deleteDeviceBackups({
      device,
      isCurrent: false,
      deps: { folders: foldersCollectionStub as never },
    });

    expect(addFolderToTrashMock).not.toBeCalled();
  });
});
