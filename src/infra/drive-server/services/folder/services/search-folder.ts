import { Result } from '../../../../../context/shared/domain/Result';
import { FolderDto } from '../../../../drive-server/out/dto';
import { DriveServerError } from '../../../drive-server.error';
import { driveServerClient } from '../../../client/drive-server.client.instance';

type Props = {
  parentFolderUuid: string;
  offset: number;
  limit?: number;
};

export async function searchFolder({
  parentFolderUuid,
  offset,
  limit = 50,
}: Props): Promise<Result<FolderDto[], DriveServerError>> {
  const { data, error } = await driveServerClient.GET('/folders/content/{uuid}/folders', {
    path: { uuid: parentFolderUuid },
    query: { offset, limit },
  });
  if (error) return { error };
  return { data: data.folders };
}
