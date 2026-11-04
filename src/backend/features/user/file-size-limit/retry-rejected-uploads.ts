import { logger } from '@internxt/drive-desktop-core/build/backend';

import { backupManager } from '../../backup';
import { TemporalFileByPathFinder } from '../../../../context/storage/TemporalFiles/application/find/TemporalFileByPathFinder';
import { getVirtualDriveContainer } from '../../virtual-drive/services/drive-folder/virtual-drive.service';
import { release } from '../../virtual-drive/services/operations/release.service';
import { clearUploadSizeLimitBlockedPath } from './add-max-file-size-rejection';
import { rejectedUploadsForSize } from './rejected-uploads-for-size';
import { unregisterRejectedUploadForSize } from './unregister-rejected-upload-for-size';

let retrying: Promise<void> | undefined;

/**
 * When the stored limit goes up, virtual-drive temporals and pending backup paths are driven again without restarting.
 */
export function retryRejectedUploads() {
  retrying ??= retry().finally(() => {
    retrying = undefined;
  });

  return retrying;
}

async function retry() {
  const rejected = [...rejectedUploadsForSize().entries()].map(([path, kind]) => ({ path, kind }));
  if (rejected.length === 0) return;

  const container = getVirtualDriveContainer();
  let shouldRunBackup = false;

  logger.debug({ tag: 'SYNC-ENGINE', msg: 'Retrying files rejected for their size', count: rejected.length });

  await Promise.allSettled(
    rejected.map(async ({ path, kind }) => {
      if (kind === 'backup') {
        shouldRunBackup = true;
        return;
      }

      if (!container) return;

      clearUploadSizeLimitBlockedPath(path);

      const temporalFile = await container.get(TemporalFileByPathFinder).run(path);
      if (!temporalFile) {
        unregisterRejectedUploadForSize({ path });
        return;
      }

      await release({ path, processName: 'file-size-limit-retry', container });
    }),
  );

  if (shouldRunBackup) {
    void backupManager.startBackup();
  }
}
