import { ipcMain } from 'electron';
import Logger from 'electron-log';
import { BackupInfo } from '../../../../backups/BackupInfo';
import { BackupWorker } from './BackupWorker';
import { BackupFatalErrors } from '../BackupFatalErrors/BackupFatalErrors';
import {
  BackupsStopController,
  StopReason,
} from '../BackupsStopController/BackupsStopController';
import { BackupsIPCMain } from '../BackupsIpc';

function configureIpcForBackup(
  info: BackupInfo,
  errors: BackupFatalErrors,
  stopController: BackupsStopController
) {
  BackupsIPCMain.handleOnce('backups.get-backup', () => info);

  BackupsIPCMain.on('backups.backup-completed', (_, folderId) => {
    stopController.backupCompleted();
    ipcMain.emit('BACKUP_COMPLETED', folderId);
  });

  BackupsIPCMain.on('backups.backup-failed', (_, _folderId, error) => {
    Logger.error(`[Backup] error: ${error}`);
    stopController.failed(error);
  });

  stopController.on('failed', ({ errorName }) => {
    errors.add([{ errorName, path: info.pathname, ...info }]);
  });

  stopController.onFinished((reason: StopReason) => {
    Logger.log(
      `[Backup] Finished ${info.pathname} (${info.folderId}) reason: ${reason}`
    );

    BackupsIPCMain.removeHandler('backups.get-backup');
    BackupsIPCMain.removeAllListeners('backups.backup-completed');
    BackupsIPCMain.removeAllListeners('backups.backup-failed');
  });
}

async function spawn(
  stopController: BackupsStopController
): Promise<StopReason> {
  let worker: BackupWorker | undefined = undefined;

  return new Promise<StopReason>((resolve) => {
    stopController.onFinished((reason: StopReason) => {
      worker?.destroy();
      resolve(reason);
    });

    worker = BackupWorker.spawn();
  });
}

export async function executeBackupWorker(
  info: BackupInfo,
  errors: BackupFatalErrors,
  stopController: BackupsStopController
): Promise<StopReason> {
  configureIpcForBackup(info, errors, stopController);

  const backupEnded = spawn(stopController);

  return await backupEnded;
}
