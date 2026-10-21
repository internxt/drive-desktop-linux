import { logger, synchronizeRemoteItems } from '@internxt/drive-desktop-core/build/backend';
import { Result } from '@internxt/drive-desktop-core/build/common/result';
import type { SyncConfig } from '../../../apps/main/remote-sync/helpers';
import type { RemoteSyncErrorHandler } from '../../../apps/main/remote-sync/RemoteSyncErrorHandler/RemoteSyncErrorHandler';
import { DriveServerError } from '../../../infra/drive-server/drive-server.error';
import { fetchFilesSyncPage } from './fetch-files-sync-page';
import { persistFilesSyncBatch } from './persist-files-sync-batch';
import { handleSyncItemFailure } from './handle-sync-item-failure';
import type { FileSyncDto } from './types';

type Props = {
  syncConfig: SyncConfig;
  fileCheckPoint: Date | undefined;
  limit: number;
  errorHandler: RemoteSyncErrorHandler;
  retryDelayMs?: number;
};

export async function syncRemoteFiles({
  syncConfig,
  fileCheckPoint,
  limit,
  errorHandler,
  retryDelayMs = 1000,
}: Props): Promise<Result<{ totalSynced: number }>> {
  let retryCount = 0;

  while (retryCount < syncConfig.maxRetries) {
    let totalSynced = 0;

    const syncResult = await synchronizeRemoteItems<FileSyncDto>({
      from: fileCheckPoint,
      limit,
      fetchPage: (request) => fetchFilesSyncPage({ request }),
      persistItems: async ({ items }) => {
        const persistResult = await persistFilesSyncBatch({ items });

        return Result.map(persistResult, () => {
          totalSynced += items.length;
        });
      },
    });

    if (!syncResult.error) {
      logger.debug({ tag: 'SYNC-ENGINE', msg: 'Remote files sync finished' });
      return Result.ok({ totalSynced });
    }

    if (syncResult.error instanceof DriveServerError && syncResult.error.cause === 'BAD_REQUEST') {
      return Result.err(syncResult.error);
    }

    retryCount++;
    handleSyncItemFailure({
      error: syncResult.error,
      errorHandler,
      syncItemType: 'files',
      itemCheckpoint: fileCheckPoint,
    });

    if (retryCount >= syncConfig.maxRetries) return Result.err(syncResult.error);

    await new Promise((resolve) => setTimeout(resolve, retryDelayMs * retryCount));
  }

  return Result.err(new Error('Unknown sync error'));
}
