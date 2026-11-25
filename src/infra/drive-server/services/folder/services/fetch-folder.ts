import { DriveItemStatus, logger } from '@internxt/drive-desktop-core/build/backend';
import { driveServerClient } from '../../../client/drive-server.client.instance';
import { DriveServerError } from '../../../drive-server.error';
import { GetFolderContentDto } from '../../../out/dto';
import { Result } from '../../../../../context/shared/domain/Result';

export async function fetchFolder(uuid: string): Promise<Result<GetFolderContentDto, DriveServerError>> {
  const { data, error } = await driveServerClient.GET('/folders/content/{uuid}', {
    path: { uuid },
  });
  if (error) return { error };
  if (data.status !== DriveItemStatus.EXISTS) {
    const error = new DriveServerError('NOT_FOUND');
    logger.error({
      msg: 'Folder status is not EXISTS',
      error,
      status: data.status,
      path: `/folders/content/${uuid}`,
    });
    return { error };
  }
  return { data };
}
