import { RemoteSyncNetworkError } from './errors';
import { RemoteSyncedFile } from './helpers';
import { patchDriveFileResponseItem } from './patch-drive-file-response-item';
import { fetchFiles } from '../../../infra/drive-server/services/files/services/fetch-files';

type Pops = {
  limit: number;
  updatedAtCheckpoint?: Date;
};

export async function fetchRemoteFiles({ limit, updatedAtCheckpoint }: Pops): Promise<{
  hasMore: boolean;
  result: RemoteSyncedFile[];
}> {
  const { data, error } = await fetchFiles({
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
    result: data.files.map(patchDriveFileResponseItem),
  };
}