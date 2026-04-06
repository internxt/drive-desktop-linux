import { RemoteSyncNetworkError } from './errors';
import { RemoteSyncedFolder } from './helpers';
import { patchDriveFolderResponseItem } from './patch-drive-folder-response-item';
import { fetchFolders } from '../../../infra/drive-server/services/folder/services/fetch-folders';

type Pops = {
  limit: number;
  updatedAtCheckpoint?: Date;
};

export async function fetchRemoteFolders({ limit, updatedAtCheckpoint }: Pops): Promise<{
  hasMore: boolean;
  result: RemoteSyncedFolder[];
}> {
  const { data, error } = await fetchFolders({
    limit,
    offset: 0,
    status: 'ALL',
    updatedAt: updatedAtCheckpoint?.toISOString(),
  });

  if (error) {
    throw new RemoteSyncNetworkError(error.message, undefined, error.statusCode);
  }

  return {
    hasMore: data.hasMore,
    result: data.folders.map(patchDriveFolderResponseItem),
  };
}