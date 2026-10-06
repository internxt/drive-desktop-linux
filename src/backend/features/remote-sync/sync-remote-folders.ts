import { logger, synchronizeRemoteItems } from '@internxt/drive-desktop-core/build/backend';
import { Result } from '@internxt/drive-desktop-core/build/common/result';
import type { SyncConfig } from '../../../apps/main/remote-sync/helpers';
import type { RemoteSyncErrorHandler } from '../../../apps/main/remote-sync/RemoteSyncErrorHandler/RemoteSyncErrorHandler';
import { DriveServerError } from '../../../infra/drive-server/drive-server.error';
import { fetchFoldersSyncPage } from './fetch-folders-sync-page';
import { persistFoldersSyncBatch } from './persist-folders-sync-batch';
import { handleSyncFolderFailure } from './handle-sync-folder-failure';
import type { FolderSyncDto } from './types';

type Props = {
  syncConfig: SyncConfig;
  folderCheckPoint: Date | undefined;
  limit: number;
  errorHandler: RemoteSyncErrorHandler;
};

export async function syncRemoteFolders({
  syncConfig,
  folderCheckPoint,
  limit,
  errorHandler,
}: Props): Promise<Result<{ totalSynced: number }>> {
  let retryCount = 0;

  while (retryCount < syncConfig.maxRetries) {
    let totalSynced = 0;

    const syncResult = await synchronizeRemoteItems<FolderSyncDto>({
      from: folderCheckPoint,
      limit,
      fetchPage: (request) => fetchFoldersSyncPage({ request }),
      persistItems: async ({ items }) => {
        const result = await persistFoldersSyncBatch({ items });
        return Result.map(result, () => {
          totalSynced += items.length;
        });
      },
    });

    if (!syncResult.error) {
      logger.debug({ tag: 'SYNC-ENGINE', msg: 'Remote folders sync finished' });
      return Result.ok({ totalSynced });
    }

    if (syncResult.error instanceof DriveServerError && syncResult.error.cause === 'BAD_REQUEST') {
      return Result.err(syncResult.error);
    }

    retryCount++;
    handleSyncFolderFailure({
      error: syncResult.error,
      errorHandler,
      folderCheckPoint,
    });

    if (retryCount >= syncConfig.maxRetries) {
      return Result.err(syncResult.error);
    }

    await new Promise((resolve) => setTimeout(resolve, 1000 * retryCount));
  }

  return Result.err(new Error('Unknown sync error'));
}
