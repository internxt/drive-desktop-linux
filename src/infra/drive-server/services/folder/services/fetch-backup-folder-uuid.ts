import { driveServerClient } from '../../../client/drive-server.client.instance';
import { DriveServerError } from '../../../drive-server.error';
import { Result } from '../../../../../context/shared/domain/Result';

export async function getBackupFolderUuid({
  folderId,
}: {
  folderId: string;
}): Promise<Result<string, DriveServerError>> {
  const { data, error } = await driveServerClient.GET('/folders/{id}/metadata', {
    path: { id: folderId },
  });

  if (error) return { error };

  return { data: data.uuid };
}
