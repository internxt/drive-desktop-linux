import Logger from 'electron-log';
import { ipcRenderer } from 'electron';
import { BackupService } from './BackupService';
import { BackupInfo } from './BackupInfo';
import { BackupsIPCRenderer } from './BackupsIPCRenderer';
import { BackupsDependencyContainerFactory } from './dependency-injection/BackupsDependencyContainerFactory';
import { DriveDesktopError } from '../../context/shared/domain/errors/DriveDesktopError';

async function executeBackup(backupInfo: BackupInfo, backupService: BackupService, abortController: AbortController) {
  try {
    const error = await backupService.run(backupInfo, abortController);

    if (error) {
      Logger.info('[BACKUPS] failed');
      BackupsIPCRenderer.send('backups.backup-failed', backupInfo.folderId, error.cause);
    } else {
      Logger.info('[BACKUPS] done');
      BackupsIPCRenderer.send('backups.backup-completed', backupInfo.folderId);
    }
  } catch (error) {
    Logger.error('[BACKUPS] ', error);
    const cause = error instanceof DriveDesktopError ? error.cause : 'UNKNOWN';
    BackupsIPCRenderer.send('backups.backup-failed', backupInfo.folderId, cause);
  }
}

function handleAbortAndOfflineEvents(abortController: AbortController, backupInfo: BackupInfo) {
  window.addEventListener('offline', () => {
    Logger.log('[BACKUPS] Internet connection lost');
    abortController.abort('CONNECTION_LOST');
    BackupsIPCRenderer.send('backups.backup-failed', backupInfo.folderId, 'NO_INTERNET');
  });

  BackupsIPCRenderer.on('backups.abort', () => {
    Logger.log('[BACKUPS] User cancelled backups');
    abortController.abort();
    BackupsIPCRenderer.send('backups.stopped');
  });
}


/**
 * This function is going to be executed by the BackupWorker when it spawns and loads the index.html file.
 * See {@link BackupWorker.spawn}
 */
export async function backupFolder(): Promise<void> {
  const container = await BackupsDependencyContainerFactory.build();
  const backupService = container.get(BackupService);
  const backupInfoResult = await backupService.getBackupInfo();

  if (backupInfoResult.isLeft()) {
    Logger.error('[BACKUPS] Error getting backup info:', backupInfoResult.getLeft());
  }

  if (backupInfoResult.isRight()) {
    const backupInfo = backupInfoResult.getRight();
    Logger.info('[BACKUPS] Backup info obtained:', backupInfo);
    const abortController = new AbortController();
    handleAbortAndOfflineEvents(abortController, backupInfo);
    await executeBackup(backupInfo, backupService, abortController);
  }
}


async function reinitializeBackups() {
  await BackupsDependencyContainerFactory.reinitialize();
  Logger.info('[BACKUPS] Reinitialized');
}

ipcRenderer.on('reinitialize-backups', async () => {
  await reinitializeBackups();
});

void backupFolder();
