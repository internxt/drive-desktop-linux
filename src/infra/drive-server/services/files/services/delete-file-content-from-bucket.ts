import { Result } from './../../../../../context/shared/domain/Result';
import { DriveServerError } from '../../../drive-server.error';
import { driveServerClient } from '../../../client/drive-server.client.instance';
export async function deleteFileFromStorageByFileId({
  bucketId,
  fileId,
}: {
  bucketId: string;
  fileId: string;
}): Promise<Result<boolean, DriveServerError>> {
  const { error } = await driveServerClient.DELETE('/files/{bucketId}/{fileId}', {
    path: {
      bucketId,
      fileId,
    },
  });

  if (error) return { error };
  return { data: true };
}
