import { logger } from '@internxt/drive-desktop-core/build/backend';
import { Nullable } from '../../../apps/shared/types/Nullable';
import { RemoteSyncError } from './errors';
import { SyncConfig } from './helpers';
import { waitBeforeRetry } from './wait-before-retry';
import { Result } from '../../../context/shared/domain/Result';

type RemoteSyncItem = {
  updatedAt: string;
  name?: string;
};

type Props<TItem extends RemoteSyncItem> = {
  from?: Date;
  finishMessage: string;
  syncConfig: SyncConfig;
  syncItemType: 'files' | 'folders';
  getCheckpoint: () => Promise<Nullable<Date>>;
  fetchRemoteItems: (updatedAtCheckpoint?: Date) => Promise<Result<{ hasMore: boolean; result: TItem[] }, Error>>;
  persistRemoteItems: (items: TItem[]) => Promise<unknown>;
  onSyncFailed: () => void;
  onSyncFinished: () => void;
  onSyncProgress: (items: TItem[]) => void;
  onSyncStateChanged: () => void;
  handleSyncError: (error: RemoteSyncError, itemName: string, checkpoint?: Date) => void;
};

export async function syncRemoteItems<TItem extends RemoteSyncItem>({
  from,
  finishMessage,
  syncConfig,
  syncItemType,
  getCheckpoint,
  fetchRemoteItems,
  persistRemoteItems,
  onSyncFailed,
  onSyncFinished,
  onSyncProgress,
  onSyncStateChanged,
  handleSyncError,
}: Props<TItem>) {
  let checkpoint = from ?? (await getCheckpoint());
  let hasMore = true;
  let retryCount = 0;

  while (hasMore && retryCount < syncConfig.maxRetries) {
    let lastSyncedItem: TItem | null = null;

    try {
      const { error, data } = await fetchRemoteItems(checkpoint);
      if (error) throw error;

      const { hasMore: moreAvailable, result } = data;

      await persistRemoteItems(result);
      onSyncProgress(result);

      lastSyncedItem = result.at(-1) ?? null;
      hasMore = moreAvailable;

      if (hasMore && lastSyncedItem) {
        checkpoint = new Date(lastSyncedItem.updatedAt);
      }

      retryCount = 0;
    } catch (error) {
      retryCount++;

      if (error instanceof RemoteSyncError) {
        handleSyncError(error, lastSyncedItem?.name ?? 'unknown', checkpoint);
      } else {
        logger.error({
          tag: 'SYNC-ENGINE',
          msg: `Remote ${syncItemType} sync failed with uncontrolled error: `,
          error,
        });
      }

      if (retryCount >= syncConfig.maxRetries) {
        onSyncFailed();
        onSyncStateChanged();
        return;
      }

      await waitBeforeRetry({ retryCount });
    }
  }

  logger.debug({
    tag: 'SYNC-ENGINE',
    msg: finishMessage,
  });
  onSyncFinished();
  onSyncStateChanged();
}
