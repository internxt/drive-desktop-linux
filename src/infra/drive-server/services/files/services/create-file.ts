import { Result } from './../../../../../context/shared/domain/Result';
import { FileDto, CreateFileDto } from '../../../out/dto';
import { driveServerClient } from '../../../client/drive-server.client.instance';
import { DriveServerError } from '../../../drive-server.error';
export async function createFile(body: CreateFileDto): Promise<Result<FileDto, DriveServerError>> {
  const { data, error } = await driveServerClient.POST('/files', {
    body,
  });

  if (error) return { error };
  return { data };
}
