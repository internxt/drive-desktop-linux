import { RemoteSyncedFile } from './helpers';

type DriveFileResponseItem = Partial<RemoteSyncedFile> & {
  fileId?: string | null;
  size?: number | string;
};

export function patchDriveFileResponseItem(payload: DriveFileResponseItem) {
  return {
    ...payload,
    fileId: payload.fileId ?? '',
    size: typeof payload.size === 'string' ? parseInt(payload.size) : payload.size,
    name: payload.name ?? undefined,
  } as RemoteSyncedFile;
}