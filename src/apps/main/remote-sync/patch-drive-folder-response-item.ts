import { RemoteSyncedFolder } from './helpers';

type DriveFolderResponseItem = Partial<RemoteSyncedFolder> & {
  removed?: boolean;
  deleted?: boolean;
};

export function patchDriveFolderResponseItem(payload: DriveFolderResponseItem) {
  let status: RemoteSyncedFolder['status'] = payload.status ?? '';

  if (!status && !payload.removed) {
    status = 'EXISTS';
  }

  if (!status && payload.removed) {
    status = 'REMOVED';
  }

  if (!status && payload.deleted) {
    status = 'DELETED';
  }

  return {
    ...payload,
    status,
    name: payload.name ?? undefined,
  } as RemoteSyncedFolder;
}