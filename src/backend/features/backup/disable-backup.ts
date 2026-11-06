import { logger } from '@internxt/drive-desktop-core/build/backend';
import configStore from '../../../apps/main/config';
import { BackupInfo } from '../../../apps/backups/BackupInfo';
import { DriveFilesCollection } from '../../../apps/main/database/collections/DriveFileCollection';
import { DriveFoldersCollection } from '../../../apps/main/database/collections/DriveFolderCollection';
import { startRemoteSync } from '../../../apps/main/remote-sync/service';
import { findBackupPathnameFromId } from './find-backup-pathname-from-id';
import { sumTotalFileSizeInBackupSubtreeSqlite } from './sum-total-file-size-in-backup-subtree-sqlite';
import { deleteBackup } from './delete-backup';

type Props = {
  backup: BackupInfo;
  deps?: {
    files: DriveFilesCollection;
    folders: DriveFoldersCollection;
  };
};

export async function disableBackup({ backup, deps }: Props) {
  const backupsList = configStore.get('backupList');
  const pathname = findBackupPathnameFromId({ id: backup.folderId });

  if (!pathname) {
    throw logger.error({ tag: 'BACKUPS', msg: 'Error finding backup pathname to disable backup' });
  }

  backupsList[pathname].enabled = false;
  configStore.set('backupList', backupsList);

  const files = deps?.files ?? new DriveFilesCollection();
  const folders = deps?.folders ?? new DriveFoldersCollection();

  let totalSize: number;

  try {
    // v.2.6.0
    // Esteban Galvis Triana
    // Guard: subtree size is read from SQLite; with lazy sync the DB may lag until a global sync runs.
    await startRemoteSync();
    totalSize = await sumTotalFileSizeInBackupSubtreeSqlite({
      files,
      folders,
      rootFolderId: backup.folderId,
    });
  } catch (error) {
    throw logger.error({
      tag: 'BACKUPS',
      msg: 'Error reading backup size from local database after disable',
      error,
    });
  }

  if (totalSize === 0) {
    const { error } = await deleteBackup({ backup, isCurrent: true });
    if (error) {
      throw logger.error({ tag: 'BACKUPS', msg: 'Error deleting backup after disabling it', error });
    }
  }
}
