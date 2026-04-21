import configStore from '../config';
import { BackupInfo } from 'src/apps/backups/BackupInfo';
import path from 'node:path';
import { fetchFolder } from '../../../infra/drive-server/services/folder/services/fetch-folder';
import { createBackup } from './create-backup';
import { migrateBackupEntryIfNeeded } from '../../../backend/features/backup/migrate-backup-entry-if-needed';
import { Device } from '../../../context/shared/domain/device/Device';
import { AbsolutePath } from '../../../context/local/localFile/infrastructure/AbsolutePath';
import { PATHS } from '../../../core/electron/paths';

type Props = {
  pathname: AbsolutePath;
  device: Device;
};

export async function enableExistingBackup({ pathname, device }: Props) {
  const backupList = configStore.get('backupList');
  const existingBackup = backupList[pathname];

  const migratedBackup = await migrateBackupEntryIfNeeded({ pathname, backup: existingBackup });

  const { error } = await fetchFolder(migratedBackup.folderUuid);

  if (error) {
    return await createBackup({ pathname, device });
  }

  const updatedBackupList = configStore.get('backupList');
  updatedBackupList[pathname].enabled = true;
  configStore.set('backupList', updatedBackupList);

  const { base } = path.parse(pathname);
  const backupInfo: BackupInfo = {
    folderUuid: migratedBackup.folderUuid,
    folderId: migratedBackup.folderId,
    pathname: pathname,
    name: base,
    tmpPath: PATHS.TEMPORAL_FOLDER,
    backupsBucket: device.bucket,
  };

  return backupInfo;
}
