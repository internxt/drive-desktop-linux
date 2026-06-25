import { FileInfo, getFileInfoWithToken, getMirrors, Mirror } from '../../../apps/main/network/requests';
import { MetadataRequiredForDownload } from './download.types';

type Props = {
  networkApiUrl: string;
  bucketId: string;
  fileId: string;
  token: string;
};

export async function getRequiredFileMetadataWithToken({
  networkApiUrl,
  bucketId,
  fileId,
  token,
}: Props): Promise<MetadataRequiredForDownload> {
  const fileMeta: FileInfo = await getFileInfoWithToken(networkApiUrl, bucketId, fileId, token);
  const mirrors: Mirror[] = await getMirrors(networkApiUrl, bucketId, fileId, null, token);

  return { fileMeta, mirrors };
}
