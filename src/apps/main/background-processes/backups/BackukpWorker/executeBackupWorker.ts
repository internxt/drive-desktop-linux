import { ipcMain } from 'electron';
import Logger from 'electron-log';
import { BackupInfo } from '../../../../backups/BackupInfo';
import { BackupWorker } from './BackupWorker';
import { BackupFatalErrors } from '../BackupFatalErrors/BackupFatalErrors';
import {
  BackupsStopController,
  StopReason,
} from '../BackupsStopController/BackupsStopController';

function configureIpcForBackup(
  info: BackupInfo,
  errors: BackupFatalErrors,
  stopController: BackupsStopController
) {
  ipcMain.handleOnce('get-backups-details', () => info);

  ipcMain.once('BACKUP_FATAL_ERROR', (_, _folderId, errorName) =>
    stopController.failed(errorName)
  );

  ipcMain.once('BACKUP_EXIT', (_, folderId) => {
    stopController.backupCompleted();
    ipcMain.emit('BACKUP_COMPLETED', folderId);
  });

  stopController.on('failed', ({ errorName }) => {
    errors.add([{ errorName, ...info }]);
  });

  stopController.onFinished((reason: StopReason) => {
    Logger.log(
      `[Backup Finished] ${info.path} (${info.folderId}) reason: ${reason}`
    );

    ipcMain.removeHandler('get-backups-details');
    ipcMain.removeAllListeners('BACKUP_FATAL_ERROR');
    ipcMain.removeAllListeners('BACKUP_EXIT');
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
