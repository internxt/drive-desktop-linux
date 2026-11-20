import * as addFolderToTrashModule from '../../../infra/drive-server/services/folder/services/add-folder-to-trash';
import * as fetchFolderModule from '../../../infra/drive-server/services/folder/services/fetch-folder';
import * as remoteSyncServiceModule from '../../../apps/main/remote-sync/service';
import * as deleteBackupModule from './delete-backup';
import * as DeviceModuleModule from '../device/device.module';
import { DriveServerError } from '../../../infra/drive-server/drive-server.error';
import { createAbsolutePath } from '../../../context/local/localFile/infrastructure/AbsolutePath';
import { call, calls, partialSpyOn } from '../../../../tests/vitest/utils.helper';
import { loggerMock } from '../../../../tests/vitest/mocks.helper';
import { deleteDeviceBackups } from './delete-device-backups';

describe('delete-device-backups', () => {
  const getBackupsFromDeviceMock = partialSpyOn(DeviceModuleModule.DeviceModule, 'getBackupsFromDevice');
  const deleteBackupMock = partialSpyOn(deleteBackupModule, 'deleteBackup');
  const fetchFolderMock = partialSpyOn(fetchFolderModule, 'fetchFolder');
  const startRemoteSyncMock = partialSpyOn(remoteSyncServiceModule, 'startRemoteSync');
  const addFolderToTrashMock = partialSpyOn(addFolderToTrashModule, 'addFolderToTrash');

  const device = {
    uuid: 'device-uuid',
    name: 'Desktop',
    bucket: 'bucket',
    removed: false,
    hasBackups: true,
  };

  const backups = [
    {
      folderUuid: 'folder-uuid-1',
      tmpPath: '/tmp',
      backupsBucket: 'bucket',
      pathname: createAbsolutePath('/home/dev/Documents'),
      name: 'Documents',
    },
  ];

  function deviceFolderChildren() {
    return {
      data: {
        children: [
          { uuid: 'folder-uuid-1', status: 'EXISTS' as const, deleted: false, removed: false },
          { uuid: 'folder-uuid-2', status: 'EXISTS' as const, deleted: false, removed: false },
          { uuid: 'trashed-uuid', status: 'TRASHED' as const, deleted: false, removed: false },
        ],
      },
    };
  }

  it('should delete each backup and trash only stale folders from the device folder', async () => {
    getBackupsFromDeviceMock.mockResolvedValue(backups);
    deleteBackupMock.mockResolvedValue({ data: true });
    fetchFolderMock.mockResolvedValue(deviceFolderChildren());
    addFolderToTrashMock.mockResolvedValue({ data: undefined as never });

    await deleteDeviceBackups({
      device,
      isCurrent: true,
    });

    calls(deleteBackupMock).toStrictEqual([{ backup: backups[0], isCurrent: true }]);
    call(fetchFolderMock).toBe('device-uuid');
    calls(addFolderToTrashMock).toStrictEqual(['folder-uuid-2']);
    expect(startRemoteSyncMock).not.toBeCalled();
  });

  it('should not trash any folder when every child is a backup', async () => {
    getBackupsFromDeviceMock.mockResolvedValue(backups);
    deleteBackupMock.mockResolvedValue({ data: true });
    fetchFolderMock.mockResolvedValue({
      data: {
        children: [{ uuid: 'folder-uuid-1', status: 'EXISTS', deleted: false, removed: false }],
      },
    });

    await deleteDeviceBackups({
      device,
      isCurrent: false,
    });

    expect(addFolderToTrashMock).not.toBeCalled();
    expect(startRemoteSyncMock).not.toBeCalled();
  });

  it('should finish when the device folder is already absent', async () => {
    getBackupsFromDeviceMock.mockResolvedValue(backups);
    deleteBackupMock.mockResolvedValue({ data: true });
    fetchFolderMock.mockResolvedValue({ error: new DriveServerError('NOT_FOUND', 404, 'folder missing') });

    await deleteDeviceBackups({
      device,
      isCurrent: true,
    });

    calls(deleteBackupMock).toHaveLength(1);
    expect(addFolderToTrashMock).not.toBeCalled();
    calls(loggerMock.error).toHaveLength(0);
  });

  it('should fail and skip orphan deletion when the device folder cannot be fetched', async () => {
    getBackupsFromDeviceMock.mockResolvedValue(backups);
    deleteBackupMock.mockResolvedValue({ data: true });
    fetchFolderMock.mockResolvedValue({ error: new DriveServerError('SERVER_ERROR', 500, 'folder failed') });

    await expect(
      deleteDeviceBackups({
        device,
        isCurrent: true,
      }),
    ).rejects.toBeUndefined();

    expect(addFolderToTrashMock).not.toBeCalled();
    expect(startRemoteSyncMock).not.toBeCalled();
    call(loggerMock.error).toMatchObject({
      tag: 'BACKUPS',
      msg: 'Failed to delete orphan folders under device',
    });
  });
});
