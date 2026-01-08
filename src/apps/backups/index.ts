import { ipcRenderer } from 'electron';
import { BackupService } from './BackupService';
import { BackupInfo } from './BackupInfo';
import { BackupsDependencyContainerFactory } from './dependency-injection/BackupsDependencyContainerFactory';
import { logger } from '@internxt/drive-desktop-core/build/backend';
import { stopController } from '../../backend/features/backup';
import { Either, left, right } from '../../context/shared/domain/Either';
import { RetryError } from '../shared/retry/RetryError';

export async function backupFolder(backupInfo: BackupInfo): Promise<Either<RetryError, void>> {
  const container = await BackupsDependencyContainerFactory.build();
  const backupService = container.get(BackupService);

  const result = await backupService.runWithRetry(backupInfo, stopController);
  if (result.isLeft()) {
    const error = result.getLeft();
    logger.debug({ tag: 'BACKUPS', msg: 'failed', error: error.cause });
    return left(error);
  } else {
    logger.debug({ tag: 'BACKUPS', msg: 'Backup completed successfully' });
    return right(undefined);
  }
}

async function reinitializeBackups() {
  await BackupsDependencyContainerFactory.reinitialize();
  logger.debug({ tag: 'BACKUPS', msg: 'Reinitialized' });
}

ipcRenderer.on('reinitialize-backups', async () => {
  await reinitializeBackups();
});
