import { FileInfo, getFileInfoWithAuth, getMirrors, Mirror, NetworkCredentials } from '../../../apps/main/network/requests';
import { MetadataRequiredForDownload } from './download.types';

type Props = {
  networkApiUrl: string;
  bucketId: string;
  fileId: string;
  creds: NetworkCredentials;
};

export async function getRequiredFileMetadataWithAuth({
  networkApiUrl,
  bucketId,
  fileId,
  creds,
}: Props): Promise<MetadataRequiredForDownload> {
  const fileMeta: FileInfo = await getFileInfoWithAuth(networkApiUrl, bucketId, fileId, creds);
  const mirrors: Mirror[] = await getMirrors(networkApiUrl, bucketId, fileId, creds);

  return { fileMeta, mirrors };
}
