import { precalculateBackupItemCount } from './precalculate-backup-item-count';
import { logger } from '@internxt/drive-desktop-core/build/backend';
import { BackupInfo } from '../../../apps/backups/BackupInfo';
import LocalTreeBuilder from '../../../context/local/localTree/application/LocalTreeBuilder';
import { RemoteTreeBuilder } from '../../../context/virtual-drive/remoteTree/application/RemoteTreeBuilder';
import { Container } from 'diod';

type Props = {
  backups: BackupInfo[];
  signal: AbortSignal;
  container: Container;
};

export async function calculateBackupsItemsCount({ backups, signal, container }: Props) {
  const itemCounts = new Map<string, number>();
  const localTreeBuilder = container.get(LocalTreeBuilder);
  const remoteTreeBuilder = container.get(RemoteTreeBuilder);

  for (const backup of backups) {
    if (signal.aborted) {
      logger.debug({ tag: 'BACKUPS', msg: 'Precalculation aborted' });
      break;
    }

    const result = await precalculateBackupItemCount(backup, localTreeBuilder, remoteTreeBuilder);
    if (result.error) {
      logger.error({
        tag: 'BACKUPS',
        msg: 'Error during backup item precalculation',
        pathname: backup.pathname,
        error: result.error,
      });
      itemCounts.set(backup.folderUuid, 0);
    } else {
      logger.debug({
        tag: 'BACKUPS',
        msg: 'Backup item count precalculated',
        pathname: backup.pathname,
        count: result.data,
      });
      itemCounts.set(backup.folderUuid, result.data);
    }
  }

  return itemCounts;
}
