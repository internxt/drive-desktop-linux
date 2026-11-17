import type { SynchronizationPageRequest } from '@internxt/drive-desktop-core/build/backend';
import { Result } from '../../../../../context/shared/domain/Result';
import { DriveServerError } from '../../../drive-server.error';
import { driveServerClient } from '../../../client/drive-server.client.instance';
import { components } from '../../../../schemas';

export type FetchFilesSyncResult = components['schemas']['GetFilesSyncResponseDto'];

export async function fetchFilesSync(
  query: SynchronizationPageRequest,
): Promise<Result<FetchFilesSyncResult, DriveServerError>> {
  const { data, error } = await driveServerClient.GET('/files/sync', { query });

  if (error) return { error };

  if (!data) {
    return { error: new DriveServerError('UNKNOWN', undefined, 'Empty response from /files/sync') };
  }

  return { data };
}
