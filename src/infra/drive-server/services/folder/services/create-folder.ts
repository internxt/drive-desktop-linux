import { FolderDto } from '../../../../drive-server/out/dto';
import { Result } from './../../../../../context/shared/domain/Result';
import { driveServerClient } from '../../../client/drive-server.client.instance';
import { DriveServerError } from '../../../drive-server.error';
type Props = {
  parentFolderUuid: string;
  plainName: string;
};

export async function createFolder({
  parentFolderUuid,
  plainName,
}: Props): Promise<Result<FolderDto, DriveServerError>> {
  const { data, error } = await driveServerClient.POST('/folders', {
    body: {
      parentFolderUuid,
      plainName,
    },
  });
  if (error) return { error };
  return { data };
}
