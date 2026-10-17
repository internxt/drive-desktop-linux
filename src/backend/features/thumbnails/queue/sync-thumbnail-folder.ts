import { join } from 'node:path';
import { logger } from '@internxt/drive-desktop-core/build/backend';
import { PATHS } from '../../../../core/electron/paths';
import { getCredentials } from '../../../../apps/main/auth/get-credentials';
import { FirstsFileSearcher } from '../../../../context/virtual-drive/files/application/search/FirstsFileSearcher';
import { FileStatuses } from '../../../../context/virtual-drive/files/domain/FileStatus';
import { getUser } from '../../auth/get-user';
import {
  clearHydrationStateForFile,
  getExistingHydrationState,
  isRangeHydrated,
} from '../../fuse/on-read/download-cache/hydration-state';
import { fileExistsOnDisk } from '../../fuse/on-read/download-cache/file-exists-on-disk';
import { requiresThumbnail } from '../placeholders/thumbnail-mime';
import { buildNetworkClient } from '../../../../infra/environment/download-file/build-network-client';
import { createSystemThumbnail } from './create-system-thumbnail';
import { hydrateFileForThumbnail } from './hydrate-file-for-thumbnail';
import { getThumbnailHydrationTargetBytes } from './thumbnail-hydration-target';
import type { ThumbnailFolderTask } from './types';

export async function syncThumbnailFolder({ folderPath, fileNames, container }: ThumbnailFolderTask) {
  const eligibleNames = fileNames.filter((fileName) => requiresThumbnail({ fileName }));
  if (eligibleNames.length === 0) return true;

  const { data: user, error } = getUser();
  if (error) {
    logger.warn({ msg: '[THUMBNAIL QUEUE] User unavailable; skipping folder thumbnail sync', folderPath, error });
    return false;
  }

  const { mnemonic } = getCredentials();
  const network = buildNetworkClient({ bridgeUser: user.bridgeUser, userId: user.userId });
  let completed = true;

  for (const fileName of eligibleNames) {
    try {
      const filePath = join(folderPath, fileName);
      const file = await container.get(FirstsFileSearcher).run({
        path: filePath,
        status: FileStatuses.EXISTS,
      });

      if (!file || file.size <= 0) continue;

      const cachePath = join(PATHS.DOWNLOADED, file.contentsId);
      const targetBytes = getThumbnailHydrationTargetBytes({ file });
      const existingState = getExistingHydrationState(file.contentsId);
      const isTargetHydrated = existingState
        ? isRangeHydrated(existingState, { position: 0, length: targetBytes })
        : false;

      if (isTargetHydrated && (await fileExistsOnDisk(cachePath))) {
        if (!(await createSystemThumbnail({ file, sourceFilePath: cachePath }))) completed = false;
        continue;
      }

      if (isTargetHydrated) {
        clearHydrationStateForFile({ contentsId: file.contentsId });
      }

      const result = await hydrateFileForThumbnail({
        file,
        filePath: cachePath,
        bucketId: user.bucket,
        mnemonic,
        network,
      });

      if (result.error) {
        completed = false;
        logger.warn({
          msg: '[THUMBNAIL QUEUE] Failed to hydrate media file for thumbnail generation',
          file: file.nameWithExtension,
          error: result.error,
        });
        continue;
      }

      if (!(await createSystemThumbnail({ file, sourceFilePath: cachePath }))) {
        completed = false;
        continue;
      }

      logger.debug({
        msg: '[THUMBNAIL QUEUE] Media file is ready for thumbnail generation',
        file: file.nameWithExtension,
      });
    } catch (error) {
      completed = false;
      logger.warn({
        msg: '[THUMBNAIL QUEUE] Failed to sync media file thumbnail',
        folderPath,
        fileName,
        error,
      });
    }
  }

  return completed;
}
