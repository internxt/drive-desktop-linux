import { Result } from '../../../../../context/shared/domain/Result';
import { FolderDto } from '../../../../../infra/drive-server/out/dto';
import { DriveServerError } from '../../../drive-server.error';
import { driveServerClient } from '../../../client/drive-server.client.instance';
type Props = {
  uuid: string;
  plainName: string;
};
export async function renameFolder({ uuid, plainName }: Props): Promise<Result<FolderDto, DriveServerError>> {
  const { data, error } = await driveServerClient.PUT('/folders/{uuid}/meta', {
    path: { uuid },
    body: { plainName },
  });

  if (error) return { error };
  return { data };
}
