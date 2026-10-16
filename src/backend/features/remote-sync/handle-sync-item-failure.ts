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
  let syncError: Error;
  if (error instanceof RemoteSyncError) {
    syncError = error;
  } else if (error instanceof DriveServerError) {
    syncError = new RemoteSyncNetworkError(error.message, undefined, error.statusCode);
  } else {
    syncError = error;
  }

  if (syncError instanceof RemoteSyncError) {
    errorHandler.handleSyncError(syncError, syncItemType, 'unknown', itemCheckpoint);
  } else {
    logger.error({
      tag: 'SYNC-ENGINE',
      msg: `Remote ${syncItemType} sync failed with uncontrolled error`,
      error,
    });
  }
}
