import { logger } from '@internxt/drive-desktop-core/build/backend';
import { userHasBackupsEnabled } from './utils/user-has-backups-enabled';
import { backupManager } from '.';

export async function startBackupsIfAvailable() {
  if (!userHasBackupsEnabled()) {
    logger.debug({ tag: 'BACKUPS', msg: 'User does not have the backup feature available' });
    return;
  }

  logger.debug({ tag: 'BACKUPS', msg: 'Start service' });
  await backupManager.startScheduler();

  if (backupManager.isScheduled()) {
    logger.debug({ tag: 'BACKUPS', msg: 'Backups schedule is set' });
  }

  logger.debug({ tag: 'BACKUPS', msg: 'Backups ready' });
}
