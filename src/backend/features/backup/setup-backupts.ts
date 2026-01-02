import { logger } from '@internxt/drive-desktop-core/build/backend';
import { userHasBackupsEnabled } from './utils/user-has-backups-enabled';
import { launchBackupProcesses } from '../../../apps/main/background-processes/backups/launchBackupProcesses';
import eventBus from '../../../apps/main/event-bus';
import { ipcMain } from 'electron';

import { backupErrorsTracker, tracker, status, scheduler, stopController } from '.';
import { registerBackupProcessTrackerIpcHandlers } from './ipc/register-backup-process-tracker-ipc-handlers';
import { registerBackupConfigurationIpcHandlers } from './ipc/register-backup-configuration-ipc-handlers';
import { registerBackupFatalErrorsIpcHandler } from './ipc/register-backup-fatal-errors-ipc-handler';
import { registerBackupProcessStatusIpcHandler } from './ipc/register-backup-process-status-ipc-handler';

export async function setUpBackups() {
  logger.debug({ tag: 'BACKUPS', msg: 'Setting up backups' });
  const userHasBackupFeatureAvailable = userHasBackupsEnabled();

  if (!userHasBackupFeatureAvailable) {
    logger.debug({ tag: 'BACKUPS', msg: 'User does not have the backup feature available' });
    return;
  }

  registerBackupProcessTrackerIpcHandlers(tracker);
  registerBackupFatalErrorsIpcHandler(backupErrorsTracker);
  registerBackupProcessStatusIpcHandler(status);
  registerBackupConfigurationIpcHandlers(scheduler);

  function stopAndClearBackups() {
    ipcMain.emit('stop-backups-process');
    scheduler.stop();
    backupErrorsTracker.clear();
    tracker.reset();
    stopController.reset();
    status.set('STANDBY');
  }

  eventBus.on('USER_LOGGED_OUT', stopAndClearBackups);
  eventBus.on('USER_WAS_UNAUTHORIZED', stopAndClearBackups);

  eventBus.on('USER_AVAILABLE_PRODUCTS_UPDATED', (updatedProducts) => {
    const userHasBackupFeatureNow = !!updatedProducts?.backups;
    if (userHasBackupFeatureNow && !userHasBackupFeatureAvailable) {
      logger.debug({
        tag: 'BACKUPS',
        msg: 'User now has the backup feature available, setting up backups',
      });
      setUpBackups();
    } else if (!userHasBackupFeatureNow && userHasBackupFeatureAvailable) {
      logger.debug({ tag: 'BACKUPS', msg: 'User no longer has the backup feature available' });
      stopAndClearBackups();
    }
  });

  ipcMain.on('start-backups-process', async () => {
    if (userHasBackupFeatureAvailable) {
      logger.debug({ tag: 'BACKUPS', msg: 'Backups started manually' });

      await launchBackupProcesses(false, tracker, status, backupErrorsTracker, stopController);
    }
  });

  ipcMain.on('BACKUP_PROCESS_FINISHED', (event) => {
    if (event?.lastExitReason === 'FORCED_BY_USER') {
      logger.debug({ tag: 'BACKUPS', msg: 'Backups process finished by user' });
    } else {
      logger.debug({ tag: 'BACKUPS', msg: 'Backups process finished' });
    }
    stopAndClearBackups();
  });

  if (userHasBackupFeatureAvailable) {
    logger.debug({ tag: 'BACKUPS', msg: 'Start service' });
    await scheduler.start();

    if (scheduler.isScheduled()) {
      logger.debug({ tag: 'BACKUPS', msg: 'Backups schedule is set' });
    }

    logger.debug({ tag: 'BACKUPS', msg: 'Backups ready' });
  }
}
