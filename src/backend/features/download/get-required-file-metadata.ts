import { IDownloadParams, MetadataRequiredForDownload } from './download.types';
import { getRequiredFileMetadataWithAuth } from './get-required-file-metadata-with-auth';
import { getRequiredFileMetadataWithToken } from './get-required-file-metadata-with-token';

type Props = Pick<IDownloadParams, 'networkApiUrl' | 'bucketId' | 'fileId' | 'creds' | 'token'>;

export async function getRequiredFileMetadata({
  networkApiUrl,
  bucketId,
  fileId,
  creds,
  token,
}: Props): Promise<MetadataRequiredForDownload> {
  if (creds) {
    return getRequiredFileMetadataWithAuth({ networkApiUrl, bucketId, fileId, creds });
  }

  if (token) {
    return getRequiredFileMetadataWithToken({ networkApiUrl, bucketId, fileId, token });
  }

  throw new Error('Download error 1');
}
