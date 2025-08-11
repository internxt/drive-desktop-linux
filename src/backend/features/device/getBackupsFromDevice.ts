import { app } from 'electron';
import { fetchFolder } from '../../../apps/main/device/fetch-folder';
import configStore from '../../../apps/main/config';
import { BackupInfo } from './../../../apps/backups/BackupInfo';
import {
  Backup,
  Device,
  findBackupPathnameFromId,
} from './../../../apps/main/device/service';

export async function getBackupsFromDevice(
  device: Device,
  isCurrent?: boolean
): Promise<Array<BackupInfo>> {
  const folder = await fetchFolder(device.uuid);
  if (isCurrent) {
    const backupsList = configStore.get('backupList');
    return folder.children
      .map((backup) => ({
        ...backup,
        pathname: findBackupPathnameFromId(backup.id),
      }))
      .filter(({ pathname }) => {
        return pathname && backupsList[pathname].enabled;
      })
      .map((backup) => ({
        ...backup,
        pathname: backup.pathname as string,
        folderId: backup.id,
        folderUuid: backup.uuid,
        tmpPath: app.getPath('temp'),
        backupsBucket: device.bucket,
      }));
  } else {
    return folder.children.map((backup: Backup) => ({
      ...backup,
      folderId: backup.id,
      folderUuid: backup.uuid,
      backupsBucket: device.bucket,
      tmpPath: '',
      pathname: '',
    }));
  }
}
