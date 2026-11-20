import { logger } from '@internxt/drive-desktop-core/build/backend';
import configStore from '../../../apps/main/config';
import { BackupInfo } from '../../../apps/backups/BackupInfo';
import { findBackupPathnameFromUuid } from './find-backup-pathname-from-uuid';
import { fetchFolderTotalSizeBytes } from '../../../infra/drive-server/services/folder/services/fetch-folder-total-size-bytes';
import { deleteBackup } from './delete-backup';

type Props = {
  backup: BackupInfo;
};

export async function disableBackup({ backup }: Props) {
  const backupsList = configStore.get('backupList');
  const pathname = findBackupPathnameFromUuid({ folderUuid: backup.folderUuid });

  if (!pathname) {
    throw logger.error({ tag: 'BACKUPS', msg: 'Error finding backup pathname to disable backup' });
  }

  backupsList[pathname].enabled = false;
  configStore.set('backupList', backupsList);

  // v.2.7.1
  // Esteban Galvis Triana
  // Folder stats are one request for this subtree. A global sync is too large to decide whether the backup is empty.
  const { data: totalSize, error: sizeError } = await fetchFolderTotalSizeBytes(backup.folderUuid);
  if (sizeError) {
    logger.error({
      tag: 'BACKUPS',
      msg: 'Failed to read backup size from remote folder; backup preserved',
      error: sizeError,
    });
    return;
  }

  if (totalSize === 0) {
    const { error } = await deleteBackup({ backup, isCurrent: true });
    if (error) {
      throw logger.error({ tag: 'BACKUPS', msg: 'Error deleting backup after disabling it', error });
    }
  }
}
