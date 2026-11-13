import { logger } from '@internxt/drive-desktop-core/build/backend';
import configStore from '../../../apps/main/config';
import { BackupInfo } from '../../../apps/backups/BackupInfo';
import { findBackupPathnameFromUuid } from './find-backup-pathname-from-uuid';
import { getBackupFolderTreeSnapshot } from './get-backup-folder-tree-snapshot';
import { deleteBackup } from './delete-backup';

type Props = {
  backup: BackupInfo;
};

export async function disableBackup({ backup }: Props): Promise<void> {
  const backupsList = configStore.get('backupList');
  const pathname = findBackupPathnameFromUuid({ folderUuid: backup.folderUuid });

  if (!pathname) {
    throw logger.error({ tag: 'BACKUPS', msg: 'Error finding backup pathname to disable backup' });
  }

  backupsList[pathname].enabled = false;
  configStore.set('backupList', backupsList);

  const { error, data } = await getBackupFolderTreeSnapshot({ folderUuid: backup.folderUuid });
  if (error) {
    throw logger.error({ tag: 'BACKUPS', msg: 'Error fetching backup folder tree snapshot', error });
  }

  const { size } = data;
  if (size === 0) {
    const { error } = await deleteBackup({ backup, isCurrent: true });
    if (error) {
      throw logger.error({ tag: 'BACKUPS', msg: 'Error deleting backup after disabling it', error });
    }
  }
}
