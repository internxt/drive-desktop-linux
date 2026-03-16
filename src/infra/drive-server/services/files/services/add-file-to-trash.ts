import { Result } from '../../../../../context/shared/domain/Result';
import { driveServerClient } from '../../../client/drive-server.client.instance';
import { DriveServerError } from '../../../drive-server.error';

export async function addFileToTrash(fileUuid: string): Promise<Result<boolean, DriveServerError>> {
  const { error } = await driveServerClient.POST('/storage/trash/add', {
    body: {
      items: [{ type: 'file', uuid: fileUuid }],
    },
  });
  if (error) return { error };
  return { data: true };
}
