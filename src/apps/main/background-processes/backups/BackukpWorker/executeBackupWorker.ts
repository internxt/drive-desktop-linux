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

  return new Promise<StopReason>((resolve) => {
    BackupsIPCMain.on('backups.backup-completed', () => {
      resolve('backup-completed');
    });

    BackupsIPCMain.on('backups.backup-failed', () => {
      resolve('failed');
    });
  });
}

export async function executeBackupWorker(
  info: BackupInfo,
  errors: BackupFatalErrors,
  stopController: BackupsStopController
): Promise<StopReason> {
  const finished = configureIpcForBackup(info, errors, stopController);

  const worker = BackupWorker.spawn();

  const reason = await finished;

  worker.destroy();

  return reason;
}
