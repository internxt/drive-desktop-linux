import { Result } from '@internxt/drive-desktop-core/build/common/result';
import { DriveServerError } from '../../../drive-server.error';
import { driveServerClient } from '../../../client/drive-server.client.instance';
import { components } from '../../../../schemas';

export type FetchFoldersSyncQuery = {
  limit: number;
  status?: 'EXISTS' | 'TRASHED' | 'DELETED';
  updatedAt?: string;
  cursor?: string;
};

export type FetchFoldersSyncResult = components['schemas']['GetFoldersSyncResponseDto'];

export async function fetchFoldersSync(
  query: FetchFoldersSyncQuery,
): Promise<Result<FetchFoldersSyncResult, DriveServerError>> {
  const { data, error } = await driveServerClient.GET('/folders/sync', {
    query,
  });

  if (error) return Result.err(error);

  if (!data) {
    return Result.err(new DriveServerError('UNKNOWN', undefined, 'Empty response from /folders/sync'));
  }

  return Result.ok(data);
}
