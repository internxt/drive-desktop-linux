import { logger } from '@internxt/drive-desktop-core/build/backend';
import { RemoteSyncError, RemoteSyncNetworkError } from '../../../apps/main/remote-sync/errors';
import type {
  RemoteSyncErrorHandler,
  syncItemType,
} from '../../../apps/main/remote-sync/RemoteSyncErrorHandler/RemoteSyncErrorHandler';
import { DriveServerError } from '../../../infra/drive-server/drive-server.error';

type Props = {
  error: Error;
  errorHandler: RemoteSyncErrorHandler;
  syncItemType: syncItemType;
  itemCheckpoint: Date | undefined;
};

export function handleSyncItemFailure({ error, errorHandler, syncItemType, itemCheckpoint }: Props) {
  switch (true) {
    case error instanceof RemoteSyncError:
      errorHandler.handleSyncError(error, syncItemType, 'unknown', itemCheckpoint);
      return;
    case error instanceof DriveServerError:
      errorHandler.handleSyncError(
        new RemoteSyncNetworkError(error.message, undefined, error.statusCode),
        syncItemType,
        'unknown',
        itemCheckpoint,
      );
      return;
    default:
      logger.error({
        tag: 'SYNC-ENGINE',
        msg: `Remote ${syncItemType} sync failed with uncontrolled error`,
        error,
      });
  }
}
