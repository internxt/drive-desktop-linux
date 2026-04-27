import { RemoteSyncNetworkError } from './errors';
import { RemoteSyncedFolder } from './helpers';
import { patchDriveFolderResponseItem } from './patch-drive-folder-response-item';
import { fetchFolders } from '../../../infra/drive-server/services/folder/services/fetch-folders';
import { Result } from '../../../context/shared/domain/Result';

type Props = {
  limit: number;
  updatedAtCheckpoint?: Date;
};

type FetchFoldersResponse = {
  hasMore: boolean;
  folders: RemoteSyncedFolder[];
};

export async function fetchRemoteFolders({ limit, updatedAtCheckpoint }: Props): Promise<Result<FetchFoldersResponse, Error>> {

  const { data, error } = await fetchFolders({
    limit,
    offset: 0,
    status: 'ALL',
    updatedAt: updatedAtCheckpoint?.toISOString(),
  });

  if (error) return { error };

  return {
    data: {
      hasMore: data.hasMore,
      folders: data.folders.map(patchDriveFolderResponseItem),
    },
  };
}
