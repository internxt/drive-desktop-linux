import { logger } from '@internxt/drive-desktop-core/build/backend';
import configStore from '../../../apps/main/config';
import { BackupInfo } from '../../../apps/backups/BackupInfo';
import { findBackupPathnameFromId } from './find-backup-pathname-from-id';
import { getBackupFolderTreeSnapshot } from './get-backup-folder-tree-snapshot';
import { deleteBackup } from './delete-backup';

type Props = {
  backup: BackupInfo;
};

export async function disableBackup({ backup }: Props): Promise<void> {
  const backupsList = configStore.get('backupList');
  const pathname = findBackupPathnameFromId({ id: backup.folderId });

  if (!pathname) {
    return;
  }

  try {
    backupsList[pathname].enabled = false;
    configStore.set('backupList', backupsList);

    const { size } = await getBackupFolderTreeSnapshot({ folderUuid: backup.folderUuid });

    if (size === 0) {
      await deleteBackup({ backup, isCurrent: true });
    }
  } catch (error) {
    logger.error({ tag: 'BACKUPS', msg: 'Error disabling backup folder', error });
  }
}
