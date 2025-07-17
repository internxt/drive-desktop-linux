import { components } from 'src/infra/schemas';
import { Backup } from '../service';
import { BackupInfo } from '../../../backups/BackupInfo';

export function mapFolderDtoToBackup(
  createFolderDto: components['schemas']['FolderDto']
): Backup {
  return {
    id: createFolderDto.id,
    name: createFolderDto.plainName,
    uuid: createFolderDto.uuid,
  };
}

export function mapFolderDtoToBackupInfo(params: {
  folderDto: components['schemas']['FolderDto'];
  pathname: string;
  tmpPath: string;
  backupsBucket: string;
}): BackupInfo {
  const { folderDto, pathname, tmpPath, backupsBucket } = params;
  return {
    name: folderDto.plainName,
    pathname,
    folderId: folderDto.id,
    folderUuid: folderDto.uuid,
    tmpPath,
    backupsBucket,
  };
}
