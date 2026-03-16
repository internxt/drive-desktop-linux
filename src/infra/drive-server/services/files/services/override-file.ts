import { Result } from '../../../../../context/shared/domain/Result';
import { driveServerClient } from '../../../client/drive-server.client.instance';
import { DriveServerError } from '../../../drive-server.error';

type Props = {
  fileUuid: string;
  fileContentsId: string;
  fileSize: number;
};

export async function overrideFile({
  fileUuid,
  fileContentsId,
  fileSize,
}: Props): Promise<Result<boolean, DriveServerError>> {
  const { error } = await driveServerClient.PUT('/files/{uuid}', {
    path: { uuid: fileUuid },
    body: {
      fileId: fileContentsId,
      size: fileSize,
    },
  });
  if (error) return { error };
  return { data: true };
}
