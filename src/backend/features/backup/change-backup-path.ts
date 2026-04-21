import { logger } from '@internxt/drive-desktop-core/build/backend';
import { basename } from 'node:path';
import configStore from '../../../apps/main/config';
import { getBackupFolderUuid } from '../../../infra/drive-server/services/folder/services/fetch-backup-folder-uuid';
import { renameFolder } from '../../../infra/drive-server/services/folder/services/rename-folder';
import { getPathFromDialog } from '../../../core/utils/get-path-from-dialog';
import { migrateBackupEntryIfNeeded } from './migrate-backup-entry-if-needed';

type Props = {
  currentPath: string;
};

export async function changeBackupPath({ currentPath }: Props): Promise<boolean> {
  const backupsList = configStore.get('backupList');
  const existingBackup = backupsList[currentPath];

  if (!existingBackup) {
    throw new Error('Backup no longer exists');
  }

  const chosen = await getPathFromDialog();
  if (!chosen || !chosen.path) {
    return false;
  }

  const chosenPath = chosen.path;
  if (backupsList[chosenPath]) {
    throw new Error('A backup with this path already exists');
  }

  const oldFolderName = basename(currentPath);
  const newFolderName = basename(chosenPath);
  if (oldFolderName !== newFolderName) {
    logger.debug({ tag: 'BACKUPS', msg: 'Renaming backup', existingBackup });

    const getFolderUuidResponse = await getBackupFolderUuid({ folderId: String(existingBackup.folderId) });
    if (getFolderUuidResponse.error) {
      throw getFolderUuidResponse.error;
    }
    const { data: folderUuid } = getFolderUuidResponse;

    const res = await renameFolder({ uuid: folderUuid, plainName: newFolderName });
    if (res.error) {
      throw new Error('Error in the request to rename a backup');
    }

    delete backupsList[currentPath];

    const migratedExistingBackup = await migrateBackupEntryIfNeeded({ pathname: chosenPath, backup: existingBackup });
    backupsList[chosenPath] = migratedExistingBackup;

    configStore.set('backupList', backupsList);

    return true;
  }

  return false;
}
