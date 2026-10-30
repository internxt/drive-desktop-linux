import type { SynchronizationPageRequest } from '@internxt/drive-desktop-core/build/backend';
import { Result } from '@internxt/drive-desktop-core/build/common/result';
import { DriveServerError } from '../../../drive-server.error';
import { driveServerClient } from '../../../client/drive-server.client.instance';
import { components } from '../../../../schemas';

export type FetchFoldersSyncResult = components['schemas']['GetFoldersSyncResponseDto'];

export async function fetchFoldersSync(
  query: SynchronizationPageRequest,
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
