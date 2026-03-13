import { Result } from '../../../../../context/shared/domain/Result';
import { FolderDto } from '../../../../drive-server/out/dto';
import { DriveServerError } from '../../../drive-server.error';
import { driveServerClient } from '../../../client/drive-server.client.instance';

type Props = {
  parentId: number;
  offset: number;
  limit?: number;
};

export async function searchFolder({
  parentId,
  offset,
  limit = 50,
}: Props): Promise<Result<FolderDto[], DriveServerError>> {
  const { data, error } = await driveServerClient.GET('/folders/{id}/folders', {
    path: { id: parentId },
    query: { offset, limit },
  });
  if (error) return { error };
  return { data: data.result };
}
