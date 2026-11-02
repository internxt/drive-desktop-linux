import { FolderDto } from '../../../../drive-server/out/dto';
import { Result } from './../../../../../context/shared/domain/Result';
import { driveServerClient } from '../../../client/drive-server.client.instance';
import { DriveServerError } from '../../../drive-server.error';
import { contentTimestampsToRequestFields } from '../../../../../shared/content-timestamps/content-timestamps-to-request-fields';

type Props = {
  parentFolderUuid: string;
  plainName: string;
  modificationTime?: Date;
  creationTime?: Date;
};

export async function createFolder({
  parentFolderUuid,
  plainName,
  modificationTime,
  creationTime,
}: Props): Promise<Result<FolderDto, DriveServerError>> {
  const { data, error } = await driveServerClient.POST('/folders', {
    body: {
      parentFolderUuid,
      plainName,
      ...contentTimestampsToRequestFields({ modificationTime, creationTime }),
    },
  });
  if (error) return { error };
  return { data };
}
