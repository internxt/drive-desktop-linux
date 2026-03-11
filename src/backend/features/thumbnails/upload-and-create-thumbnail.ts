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

export async function uploadAndCreateThumbnail({
  thumbnailBuffer,
  fileUuid,
  environment,
  bucket,
}: Props): Promise<Result<ThumbnailDto, Error>> {
  const uploaded = await uploadThumbnailToBucket(environment, bucket, thumbnailBuffer);

  if (uploaded.error) {
    return { error: uploaded.error };
  }

  return createThumbnail({
    fileUuid,
    type: 'png',
    size: thumbnailBuffer.length,
    maxWidth: THUMBNAIL_SIZE,
    maxHeight: THUMBNAIL_SIZE,
    bucketId: bucket,
    bucketFile: uploaded.data,
    encryptVersion: '03-aes',
  });
}
