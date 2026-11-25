import { Result } from '../../../../../context/shared/domain/Result';
import { driveServerClient } from '../../../client/drive-server.client.instance';
import { DriveServerError } from '../../../drive-server.error';
import { UserFileSizeLimit } from '../../../out/dto';

type GetUserFileSizeLimitProps = {
  signal?: AbortSignal;
};

export async function getUserFileSizeLimit(
  props?: GetUserFileSizeLimitProps,
): Promise<Result<UserFileSizeLimit, DriveServerError>> {
  const options = props?.signal ? { signal: props.signal } : {};
  const { data, error } = await driveServerClient.GET('/files/limits', options);

  if (error) return { error };

  return { data: data.maxUploadFileSize };
}
