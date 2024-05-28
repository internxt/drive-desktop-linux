import { powerSaveBlocker, ipcMain } from 'electron';
import { clearBackupsIssues } from '../../issues/virtual-drive';
import { BackupsStopController } from './BackupsStopController/BackupsStopController';
import { BackupsProcessStatus } from './BackupsProcessStatus/BackupsProcessStatus';
import { BackupFatalErrors } from './BackupFatalErrors/BackupFatalErrors';
import { BackupsProcessTracker } from './BackupsProcessTracker/BackupsProcessTracker';
import backupsConfig from './BackupConfiguration/BackupConfiguration';
import { executeBackupWorker } from './BackukpWorker/executeBackupWorker';
import Logger from 'electron-log';

function backupsCanRun(status: BackupsProcessStatus) {
  return status.isIn('STANDBY') && backupsConfig.enabled;
}

export async function launchBackupProcesses(
  scheduled: boolean,
  tracker: BackupsProcessTracker,
  status: BackupsProcessStatus,
  errors: BackupFatalErrors,
  stopController: BackupsStopController
): Promise<void> {
  if (!backupsCanRun(status)) {
    Logger.debug('[BACKUPS] Already running');
    return;
  }

  status.set('RUNNING');

  const suspensionBlockId = powerSaveBlocker.start('prevent-display-sleep');

  const backups = await backupsConfig.obtainBackupsInfo();

  clearBackupsIssues();
  errors.clear();

  tracker.track(backups);

  stopController.on('forced-by-user', () => {
    ipcMain.emit('BACKUP_PROCESS_FINISHED', {
      scheduled,
      foldersToBackup: tracker.totalBackups(),
      lastExitReason: 'FORCED_BY_USER',
    });
  });

  stopController.on('backup-completed', () => {
    ipcMain.emit('BACKUP_PROCESS_FINISHED', {
      scheduled,
      foldersToBackup: tracker.totalBackups(),
      lastExitReason: 'PROCESS_FINISHED',
    });
  });

  ipcMain.once('stop-backups-process', () => {
    stopController.userCancelledBackup();
  });

  ipcMain.emit('BACKUP_PROCESS_STARTED', {
    scheduled,
    foldersToBackup: backups,
  });

  for (const backupInfo of backups) {
    tracker.backing(backupInfo);

    if (stopController.hasFinished()) {
      Logger.debug('[BACKUPS] Already finished');
      continue;
    }

    // eslint-disable-next-line no-await-in-loop
    const finishReason = await executeBackupWorker(
      backupInfo,
      errors,
      stopController
    );

    tracker.backupFinishedWith(finishReason);
  }

  ipcMain.emit('BACKUPS:PROCESS_FINISHED');

  status.set('STANDBY');

  stopController.reset();

  ipcMain.removeAllListeners('stop-backups-process');

  powerSaveBlocker.stop(suspensionBlockId);

  ipcMain.removeAllListeners('BACKUP_PROGRESS');
}
