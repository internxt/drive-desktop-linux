import { IDownloadParams, MetadataRequiredForDownload } from './download.types';
import { getRequiredFileMetadataWithAuth } from './get-required-file-metadata-with-auth';
import { getRequiredFileMetadataWithToken } from './get-required-file-metadata-with-token';
import { Result } from '../../../context/shared/domain/Result';

type Props = Pick<IDownloadParams, 'networkApiUrl' | 'bucketId' | 'fileId' | 'creds' | 'token'>;

export async function getRequiredFileMetadata({
  networkApiUrl,
  bucketId,
  fileId,
  creds,
  token,
}: Props): Promise<Result<MetadataRequiredForDownload, Error>> {
  if (creds) {
    const result = await getRequiredFileMetadataWithAuth({ networkApiUrl, bucketId, fileId, creds });
    return { data: result };
  }

  if (token) {
    const result = await getRequiredFileMetadataWithToken({ networkApiUrl, bucketId, fileId, token });
    return { data: result };
  }

  return { error: new Error('Could not retrieve file metadata: Either creds or token must be provided') };
}
