import { logger } from '@internxt/drive-desktop-core/build/backend';
import { backupManager } from '../../backup';
import { cancelPendingRemoteSync } from '../../../../apps/main/remote-sync/service';
import { stopVirtualDriveOnce } from '../../virtual-drive/services/drive-folder/virtual-drive.service';
import { AntivirusScanService } from '../../../../apps/main/antivirus/AntivirusScanService';
import { getAntivirusManager } from '../../../../apps/main/antivirus/antivirusManager';
import { stopMailBridge } from '../../mail-bridge';
import { resetTrayStatus } from '../../../../apps/main/tray/tray-setup';
import { tryCatch } from '../../../../shared/try-catch';

/**
 * v2.7.1 Alexis Mora
 * Stops what runs in the background when the backend rejects this version. At startup nothing has started yet,
 * so every step tolerates having nothing to stop. Cleaner, antivirus and settings are only reachable from the
 * widget, which shows the update banner instead. We do not run the logout teardown, so the session and the
 * local database stay as they are and the first launch after updating starts everything normally.
 */
export async function haltFeatures() {
  logger.warn({ msg: 'Halting features because this client version is no longer supported' });
  resetTrayStatus('ALERT');

  const onError = (step: string) => (error: unknown) => logger.error({ msg: 'Failed to halt feature', step, error });

  await Promise.all([
    tryCatch(() => backupManager.stopAndClearBackups(), onError('backups')),
    tryCatch(cancelPendingRemoteSync, onError('remote-sync')),
    tryCatch(stopVirtualDriveOnce, onError('virtual-drive')),
    tryCatch(async () => {
      await AntivirusScanService.cancelScan();
      await getAntivirusManager().shutdown();
    }, onError('antivirus')),
    tryCatch(async () => {
      await stopMailBridge();
    }, onError('mail-bridge')),
  ]);
}
