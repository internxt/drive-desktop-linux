import { logger } from '@internxt/drive-desktop-core/build/backend';
import { getCredentials } from '../../../../apps/main/auth/get-credentials';
import { getUser } from '../../auth/get-user';
import { requiresThumbnail } from '../placeholders/thumbnail-mime';
import { buildNetworkClient } from '../../../../infra/environment/download-file/build-network-client';
import { syncThumbnailFile } from './sync-thumbnail-file';
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
    const synced = await syncThumbnailFile({
      fileName,
      folderPath,
      container,
      bucketId: user.bucket,
      mnemonic,
      network,
    });
    if (!synced) completed = false;
  }

  return completed;
}
