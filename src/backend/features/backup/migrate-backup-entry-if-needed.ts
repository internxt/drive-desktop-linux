import { logger } from '@internxt/drive-desktop-core/build/backend/core/logger/logger';
import configStore from '../../../apps/main/config';
import { getBackupFolderUuid } from '../../../infra/drive-server/services/folder/services/fetch-backup-folder-uuid';

type BackupEntry = {
  enabled: boolean;
  folderId: number;
  folderUuid: string;
};

type Props = {
  pathname: string;
  backup: BackupEntry;
};

export async function migrateBackupEntryIfNeeded({ pathname, backup }: Props): Promise<BackupEntry> {
  if (backup.folderUuid) {
    return backup;
  }

  try {
    const getFolderUuidResponse = await getBackupFolderUuid({ folderId: String(backup.folderId) });
    if (getFolderUuidResponse.error) {
      logger.error({
        tag: 'BACKUPS',
        msg: `Failed to migrate backup entry for ${pathname}`,
        error: getFolderUuidResponse.error,
      });
      throw getFolderUuidResponse.error;
    }

    const { data: folderUuid } = getFolderUuidResponse;
    backup.folderUuid = folderUuid;

    const backupList = configStore.get('backupList');
    backupList[pathname] = backup;
    configStore.set('backupList', backupList);

    logger.debug({
      tag: 'BACKUPS',
      msg: `Successfully migrated backup entry for ${pathname} with UUID ${folderUuid}`,
    });

    return backup;
  } catch (error) {
    logger.error({
      tag: 'BACKUPS',
      msg: `Error migrating backup entry for ${pathname}`,
      error,
    });
    throw error;
  }
}
