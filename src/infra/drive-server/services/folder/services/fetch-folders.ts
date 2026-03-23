import { logger } from '@internxt/drive-desktop-core/build/backend';
import { Result } from '../../../../../context/shared/domain/Result';
import { DriveServerError } from '../../../drive-server.error';
import { driveServerClient } from '../../../client/drive-server.client.instance';

type FetchFoldersQuery = {
  limit: number;
  offset: number;
  status: 'ALL' | 'EXISTS' | 'TRASHED' | 'DELETED';
  updatedAt?: string;
};

type FetchFoldersResult = {
  folders: Record<string, unknown>[];
  hasMore: boolean;
};

export async function fetchFolders(query: FetchFoldersQuery): Promise<Result<FetchFoldersResult, DriveServerError>> {
  const { data, error } = await driveServerClient.GET('/folders', {
    query,
  });

  if (error) return { error };

  if (!Array.isArray(data)) {
    logger.error({
      msg: `Expected to receive an array of folders, but received: ${JSON.stringify(data, null, 2)}`,
      path: '/folders',
    });
    return { error: new DriveServerError('UNKNOWN', undefined, 'Invalid response: expected array of folders') };
  }

  return {
    data: {
      folders: data,
      hasMore: data.length === query.limit,
    },
  };
}
