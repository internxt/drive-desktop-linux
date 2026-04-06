import {
  RemoteSyncError,
  RemoteSyncInvalidResponseError,
  RemoteSyncNetworkError,
  RemoteSyncServerError,
} from './errors';
import { VirtualDriveIssue } from '../../../shared/issues/VirtualDriveIssue';

export type RemoteSyncItemType = 'files' | 'folders';

export type RemoteSyncErrorDetail = {
  errorLabel: 'network' | 'server' | 'remote';
  issue: VirtualDriveIssue;
};

type GetRemoteSyncErrorDetailPops = {
  error: RemoteSyncError;
  syncItemType: RemoteSyncItemType;
  itemName: string;
};

function createVirtualDriveIssue({
  syncItemType,
  itemName,
  cause,
}: {
  syncItemType: RemoteSyncItemType;
  itemName: string;
  cause: VirtualDriveIssue['cause'];
}): VirtualDriveIssue {
  if (syncItemType === 'files') {
    return {
      error: 'DOWNLOAD_ERROR',
      cause,
      name: itemName,
    };
  }

  return {
    error: 'FOLDER_CREATE_ERROR',
    cause,
    name: itemName,
  };
}

export function getRemoteSyncErrorDetail({ error, syncItemType, itemName }: GetRemoteSyncErrorDetailPops) {
  if (error instanceof RemoteSyncInvalidResponseError) {
    return null;
  }

  if (error instanceof RemoteSyncNetworkError) {
    return {
      errorLabel: 'network',
      issue: createVirtualDriveIssue({
        syncItemType,
        itemName,
        cause: 'NO_INTERNET',
      }),
    } satisfies RemoteSyncErrorDetail;
  }

  if (error instanceof RemoteSyncServerError) {
    return {
      errorLabel: 'server',
      issue: createVirtualDriveIssue({
        syncItemType,
        itemName,
        cause: 'NO_REMOTE_CONNECTION',
      }),
    } satisfies RemoteSyncErrorDetail;
  }

  return {
    errorLabel: 'remote',
    issue: createVirtualDriveIssue({
      syncItemType,
      itemName,
      cause: 'NO_REMOTE_CONNECTION',
    }),
  } satisfies RemoteSyncErrorDetail;
}
