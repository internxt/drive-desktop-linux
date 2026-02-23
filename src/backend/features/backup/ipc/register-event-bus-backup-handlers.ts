import { logger } from '@internxt/drive-desktop-core/build/backend';
import { backupManager } from '..';
import eventBus from '../../../../apps/main/event-bus';
import { startBackupsIfAvailable } from '../start-backups-if-available';

function stopBackups() {
  try {
    backupManager.stopAndClearBackups();
  } catch (error) {
    logger.error({ tag: 'BACKUPS', msg: 'Error stopping backups', error });
  }
}

export function registerEventBusBackupHandlers() {
  eventBus.on('USER_LOGGED_OUT', () => stopBackups());
  eventBus.on('USER_WAS_UNAUTHORIZED', () => stopBackups());

  eventBus.on('USER_AVAILABLE_PRODUCTS_UPDATED', (updatedProducts) => {
    if (updatedProducts?.backups) {
      logger.debug({
        tag: 'BACKUPS',
        msg: 'User has the backup feature available, starting backups',
      });
      startBackupsIfAvailable();
    } else {
      logger.debug({ tag: 'BACKUPS', msg: 'User does not have the backup feature available' });
      stopBackups();
    }
  });
}
