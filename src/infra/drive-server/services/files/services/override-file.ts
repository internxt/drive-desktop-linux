import { Result } from '../../../../../context/shared/domain/Result';
import { contentTimestampsToRequestFields } from '../../../../../shared/content-timestamps/content-timestamps-to-request-fields';
import { driveServerClient } from '../../../client/drive-server.client.instance';
import { DriveServerError } from '../../../drive-server.error';

export type OverrideFileProps = {
  fileUuid: string;
  fileContentsId: string;
  fileSize: number;
  modificationTime?: Date;
};

export async function overrideFile({
  fileUuid,
  fileContentsId,
  fileSize,
  modificationTime,
}: OverrideFileProps): Promise<Result<boolean, DriveServerError>> {
  const body = {
    fileId: fileContentsId,
    size: fileSize,
    ...contentTimestampsToRequestFields({ modificationTime }),
  };

  const { error } = await driveServerClient.PUT('/files/{uuid}', {
    path: { uuid: fileUuid },
    body,
  });
  if (error) return { error };
  return { data: true };
}
