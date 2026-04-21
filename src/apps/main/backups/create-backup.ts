import path from 'node:path';
import { Device } from '../../../context/shared/domain/device/Device';
import configStore from '../config';
import { BackupInfo } from 'src/apps/backups/BackupInfo';
import { app } from 'electron';
import { createBackupFolder } from './create-backup-folder';
import { AbsolutePath } from '../../../context/local/localFile/infrastructure/AbsolutePath';

type Props = {
  pathname: AbsolutePath;
  device: Device;
};

export async function createBackup({ pathname, device }: Props) {
  const { base } = path.parse(pathname);
  const { error, data: newBackup } = await createBackupFolder({ folderName: base, device });
  if (error) return;

  const backupList = configStore.get('backupList');
  backupList[pathname] = {
    enabled: true,
    folderId: newBackup.id,
    folderUuid: newBackup.uuid,
  };

  configStore.set('backupList', backupList);

  const createdBackup: BackupInfo = {
    folderUuid: newBackup.uuid,
    folderId: newBackup.id,
    pathname,
    name: base,
    tmpPath: app.getPath('temp'),
    backupsBucket: device.bucket,
  };

  return createdBackup;
}
