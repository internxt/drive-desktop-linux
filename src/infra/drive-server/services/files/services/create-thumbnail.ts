import { Result } from './../../../../../context/shared/domain/Result';
import { CreateThumbnailDto, ThumbnailDto } from '../../../out/dto';
import { DriveServerError } from '../../../drive-server.error';
import { driveServerClient } from '../../../client/drive-server.client.instance';

export async function createThumbnail(body: CreateThumbnailDto): Promise<Result<ThumbnailDto, DriveServerError>> {
  const { data, error } = await driveServerClient.POST('/files/thumbnail', {
    body,
  });
  if (error) return { error };
  return { data };
}
