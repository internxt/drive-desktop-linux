import { logger } from '@internxt/drive-desktop-core/build/backend';
import { addVirtualDriveIssue } from '../issues/virtual-drive';
import { RemoteSyncError } from './errors';
import { getRemoteSyncErrorDetail, RemoteSyncItemType } from './get-remote-sync-error-detail';

export type HandleSyncErrorPops = {
  error: RemoteSyncError;
  syncItemType: RemoteSyncItemType;
  itemName: string;
  itemCheckpoint?: Date;
};

export type RemoteSyncErrorHandler = {
  handleSyncError: (props: HandleSyncErrorPops) => void;
};

export function handleSyncError({ error, syncItemType, itemName, itemCheckpoint }: HandleSyncErrorPops) {
  const errorDetail = getRemoteSyncErrorDetail({
    error,
    syncItemType,
    itemName,
  });

  if (!errorDetail) {
    return;
  }

  logger.error({
    tag: 'SYNC-ENGINE',
    msg: `Remote ${syncItemType} sync failed`,
    error,
    errorLabel: errorDetail.errorLabel,
    itemName,
    itemCheckpoint,
  });

  addVirtualDriveIssue(errorDetail.issue);
}

export function createRemoteSyncErrorHandler(): RemoteSyncErrorHandler {
  return {
    handleSyncError,
  };
}
