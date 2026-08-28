import { Result } from '../../../../../context/shared/domain/Result';
import { DriveServerError } from '../../../drive-server.error';
import { driveServerClient } from '../../../client/drive-server.client.instance';
import { components } from '../../../../schemas';

type FetchFilesSyncQuery = {
  limit: number;
  status?: 'EXISTS' | 'TRASHED' | 'DELETED';
  updatedAt?: string;
  cursor?: string;
};

type FetchFilesSyncResult = {
  files: components['schemas']['FileSyncDto'][];
  nextCursor: string | null;
};

export async function fetchFilesSync(
  query: FetchFilesSyncQuery,
): Promise<Result<FetchFilesSyncResult, DriveServerError>> {
  const { data, error } = await driveServerClient.GET('/files/sync', { query });

  if (error) return { error };

  if (!data) {
    return { error: new DriveServerError('UNKNOWN', undefined, 'Empty response from /files/sync') };
  }

  return { data };
}
