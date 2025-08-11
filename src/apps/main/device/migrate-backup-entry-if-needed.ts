import { logger } from '@internxt/drive-desktop-core/build/backend/core/logger/logger';
import configStore from '../config';
import { fetchFolderById } from './fetch-folder-by-id';

/*
 v2.4.10 Alexis Mora
 This is a function that migrates the backup object withn the record in 'backupList' to include the folder UUID.
 since we are phasing out the folder ID, we need to ensure that all backups have a UUID.
 This function and the whole migration should be removed 1 year at most after the release of v2.4.10.
*/
export async function migrateBackupEntryIfNeeded(
  pathname: string,
  backup: {
    enabled: boolean;
    folderId: number;
    folderUuid: string;
  }
): Promise<{
  enabled: boolean;
  folderId: number;
  folderUuid: string;
}> {
  if (!backup.folderUuid) {
    try {
      logger.debug({
        msg: `[BACKUP MIGRATION] Migrating backup entry for ${pathname}, fetching UUID for folder ID ${backup.folderId}`,
      });

      const res = await fetchFolderById(backup.folderId.toString());

      if (res.data) {
        const { data } = res;
        backup.folderUuid = data.uuid;

        const backupList = configStore.get('backupList');
        backupList[pathname] = backup;
        configStore.set('backupList', backupList);

        logger.debug({
          msg: `[BACKUP MIGRATION] Successfully migrated backup entry for ${pathname} with UUID ${data.uuid}`,
        });
      } else {
        logger.warn({
          msg: `[BACKUP MIGRATION] Failed to fetch folder details for ${pathname}, error: ${res.error}`,
        });
      }
    } catch (error) {
      logger.error({
        msg: `[BACKUP MIGRATION] Failed to migrate backup UUID for ${pathname}:`,
        error,
      });
    }
  }
  return backup;
}
