import { logger } from '@internxt/drive-desktop-core/build/backend';
import { RemoteSyncError, RemoteSyncNetworkError } from '../../../apps/main/remote-sync/errors';
import type { RemoteSyncErrorHandler } from '../../../apps/main/remote-sync/RemoteSyncErrorHandler/RemoteSyncErrorHandler';
import { DriveServerError } from '../../../infra/drive-server/drive-server.error';

type Props = {
  error: Error;
  errorHandler: RemoteSyncErrorHandler;
  folderCheckPoint: Date | undefined;
};

export function handleSyncFolderFailure({ error, errorHandler, folderCheckPoint }: Props) {
  const syncError =
    error instanceof RemoteSyncError
      ? error
      : error instanceof DriveServerError
        ? new RemoteSyncNetworkError(error.message, undefined, error.statusCode)
        : error;

  if (syncError instanceof RemoteSyncError) {
    errorHandler.handleSyncError(syncError, 'folders', 'unknown', folderCheckPoint);
  } else {
    logger.error({
      tag: 'SYNC-ENGINE',
      msg: 'Remote folders sync failed with uncontrolled error',
      error,
    });
  }
}
