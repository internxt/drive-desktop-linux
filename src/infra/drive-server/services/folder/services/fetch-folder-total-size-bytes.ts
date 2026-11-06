import { driveServerClient } from '../../../client/drive-server.client.instance';
import { DriveServerError } from '../../../drive-server.error';
import { Result } from '../../../../../context/shared/domain/Result';

export async function fetchFolderTotalSizeBytes(uuid: string): Promise<Result<number, DriveServerError>> {
  const { data, error } = await driveServerClient.GET('/folders/{uuid}/stats', {
    path: { uuid },
  });
  if (error) return { error };
  return { data: data.totalSize };
}
