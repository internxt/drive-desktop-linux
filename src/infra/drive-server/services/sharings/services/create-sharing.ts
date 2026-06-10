import { Result } from '../../../../../context/shared/domain/Result';
import { components } from '../../../../schemas';
import { driveServerClient } from '../../../client/drive-server.client.instance';
import { DriveServerError } from '../../../drive-server.error';

type PublicSharingInfo = {
  id: string;
  encryptedCode: string;
};

type CreateSharingPayload = components['schemas']['CreateSharingDto'];

type Props = {
  body: CreateSharingPayload;
};

export async function createSharing({ body }: Props): Promise<Result<PublicSharingInfo, DriveServerError>> {
  const { data, error } = await driveServerClient.POST('/sharings', { body });

  if (error) return { error };

  return { data };
}