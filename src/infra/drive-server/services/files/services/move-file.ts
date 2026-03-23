import { Result } from '../../../../../context/shared/domain/Result';
import { driveServerClient } from '../../../client/drive-server.client.instance';
import { DriveServerError } from '../../../drive-server.error';

export async function moveFile({
  destinationFolder,
  uuid,
}: {
  destinationFolder: string;
  uuid: string;
}): Promise<Result<boolean, DriveServerError>> {
  const { error } = await driveServerClient.PATCH('/files/{uuid}', {
    path: { uuid },
    body: {
      destinationFolder,
    },
  });

  if (error) return { error };
  return { data: true };
}
