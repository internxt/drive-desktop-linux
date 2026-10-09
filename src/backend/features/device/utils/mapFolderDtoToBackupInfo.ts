import { FolderDtoWithPathname } from './../device.types';
import { BackupInfo } from './../../../../apps/backups/BackupInfo';
import { createAbsolutePath } from '../../../../context/local/localFile/infrastructure/AbsolutePath';
import { app } from 'electron';

export function mapFolderDtoToBackupInfo(backup: FolderDtoWithPathname): BackupInfo {
  return {
    name: backup.plainName,
    pathname: createAbsolutePath(backup.pathname),
    folderId: backup.id,
    folderUuid: backup.uuid,
    tmpPath: app.getPath('temp'),
    backupsBucket: backup.bucket,
  };
}
