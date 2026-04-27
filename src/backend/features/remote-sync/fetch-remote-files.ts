import { RemoteSyncedFile } from './helpers';
import { patchDriveFileResponseItem } from './patch-drive-file-response-item';
import { fetchFiles } from '../../../infra/drive-server/services/files/services/fetch-files';
import { Result } from '../../../context/shared/domain/Result';

type Props = {
  limit: number;
  updatedAtCheckpoint?: Date;
};

type FetchFilesResponse = {
  hasMore: boolean;
  files: RemoteSyncedFile[];
};

export async function fetchRemoteFiles({ limit, updatedAtCheckpoint }: Props): Promise<Result<FetchFilesResponse, Error>> {
  const { data, error } = await fetchFiles({
    limit,
    offset: 0,
    status: 'ALL',
    updatedAt: updatedAtCheckpoint?.toISOString(),
  });

  if (error) return { error };

  return { data:
    {
      hasMore: data.hasMore,
      files: data.files.map(patchDriveFileResponseItem)
    }
  };
}
