import { logger } from '@internxt/drive-desktop-core/build/backend/core/logger/logger';
import configStore from '../../../apps/main/config';
import { getBackupFolderUuid } from '../../../infra/drive-server/services/folder/services/fetch-backup-folder-uuid';
import { Result } from '../../../context/shared/domain/Result';
import { BackupEntry, StoredBackupEntry } from './types/BackupEntry';

type Props = {
  pathname: string;
  backup: StoredBackupEntry;
};

export async function migrateBackupEntryIfNeeded({ pathname, backup }: Props): Promise<Result<BackupEntry, Error>> {
  if (backup.folderUuid) {
    const normalized: BackupEntry = { enabled: backup.enabled, folderUuid: backup.folderUuid };
    return { data: normalized };
  }

  const legacyFolderId = backup.folderId;
  if (legacyFolderId === undefined) {
    return { error: new Error(`Backup entry for ${pathname} has no folderUuid or legacy folderId`) };
  }

  const { error, data: folderUuid } = await getBackupFolderUuid({ legacyNumericFolderId: String(legacyFolderId) });
  if (error) {
    logger.error({
      tag: 'BACKUPS',
      msg: `Failed to migrate backup entry for ${pathname}`,
      error,
    });
    return { error };
  }

  const migrated: BackupEntry = { enabled: backup.enabled, folderUuid };

  const backupList = configStore.get('backupList');
  backupList[pathname] = migrated;
  configStore.set('backupList', backupList);

  logger.debug({
    tag: 'BACKUPS',
    msg: `Successfully migrated backup entry for ${pathname} with UUID ${folderUuid}`,
  });

  return { data: migrated };
}
