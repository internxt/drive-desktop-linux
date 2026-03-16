import { Result } from '../../../../../context/shared/domain/Result';
import { FolderDto } from '../../../../../infra/drive-server/out/dto';
import { DriveServerError } from '../../../drive-server.error';
import { driveServerClient } from '../../../client/drive-server.client.instance';
type Props = {
  uuid: string;
  destinationFolder: string;
};
export async function moveFolder({ uuid, destinationFolder }: Props): Promise<Result<FolderDto, DriveServerError>> {
  const { data, error } = await driveServerClient.PATCH('/folders/{uuid}', {
    path: { uuid },
    body: { destinationFolder },
  });
  if (error) return { error };
  return { data };
}
