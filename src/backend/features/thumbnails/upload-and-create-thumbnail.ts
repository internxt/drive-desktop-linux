import { Environment } from '@internxt/inxt-js';
import { Result } from '../../../context/shared/domain/Result';
import { ThumbnailDto } from '../../../infra/drive-server/out/dto';
import { createThumbnail } from '../../../infra/drive-server/services/files/services/create-thumbnail';
import { THUMBNAIL_SIZE } from './thumbnail.constants';
import { uploadThumbnailToBucket } from './upload-thumbnail-to-bucket';

type Props = {
  thumbnailBuffer: Buffer;
  fileUuid: string;
  environment: Environment;
  bucket: string;
};

export async function uploadAndCreateThumbnail(params: Props): Promise<Result<ThumbnailDto, Error>> {
  const uploaded = await uploadThumbnailToBucket(params.environment, params.bucket, params.thumbnailBuffer);

  if (uploaded.error) {
    return { error: uploaded.error };
  }

  return createThumbnail({
    fileUuid: params.fileUuid,
    type: 'png',
    size: params.thumbnailBuffer.length,
    maxWidth: THUMBNAIL_SIZE,
    maxHeight: THUMBNAIL_SIZE,
    bucketId: params.bucket,
    bucketFile: uploaded.data,
    encryptVersion: '03-aes',
  });
}
