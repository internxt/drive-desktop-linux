import { logger } from '@internxt/drive-desktop-core/build/backend';
import { Result } from '../../../../../context/shared/domain/Result';
import { DriveServerError } from '../../../drive-server.error';
import { driveServerClient } from '../../../client/drive-server.client.instance';

type FetchFilesQuery = {
  limit: number;
  offset: number;
  status: 'ALL' | 'EXISTS' | 'TRASHED' | 'DELETED';
  updatedAt?: string;
};

type FetchFilesResult = {
  files: Record<string, unknown>[];
  hasMore: boolean;
};

export async function fetchFiles(query: FetchFilesQuery): Promise<Result<FetchFilesResult, DriveServerError>> {
  const { data, error } = await driveServerClient.GET('/files', {
    query,
  });

  if (error) return { error };

  if (!Array.isArray(data)) {
    logger.error({
      msg: `Expected to receive an array of files, but received: ${JSON.stringify(data, null, 2)}`,
      path: '/files',
    });
    return { error: new DriveServerError('UNKNOWN', undefined, 'Invalid response: expected array of files') };
  }

  return {
    data: {
      files: data,
      hasMore: data.length === query.limit,
    },
  };
}
