import * as uploadThumbnailToBucketModule from './upload-thumbnail-to-bucket';
import * as createThumbnailModule from '../../../infra/drive-server/services/files/services/create-thumbnail';
import { uploadAndCreateThumbnail } from './upload-and-create-thumbnail';
import { call, partialSpyOn } from 'tests/vitest/utils.helper';
import { THUMBNAIL_SIZE } from './thumbnail.constants';
import { DriveServerError } from '../../../infra/drive-server/drive-server.error';
import { Environment } from '@internxt/inxt-js';

describe('upload-and-create-thumbnail', () => {
  const uploadThumbnailToBucketMock = partialSpyOn(uploadThumbnailToBucketModule, 'uploadThumbnailToBucket');
  const createThumbnailMock = partialSpyOn(createThumbnailModule, 'createThumbnail');

  const environment = {} as Environment;
  const bucket = 'test-bucket';
  const fileUuid = 'file-uuid';
  const thumbnailBuffer = Buffer.from('thumbnail-data');

  it('should return error when upload to bucket fails', async () => {
    const uploadError = new Error('Upload failed');
    uploadThumbnailToBucketMock.mockResolvedValue({ error: uploadError });

    const { error } = await uploadAndCreateThumbnail({ thumbnailBuffer, fileUuid, environment, bucket });

    expect(error).toBe(uploadError);
    expect(createThumbnailMock).not.toHaveBeenCalled();
  });

  it('should call createThumbnail with correct params after successful bucket upload', async () => {
    const contentsId = 'contents-id-123';
    const thumbnailDto = { id: 1, type: 'png' };

    uploadThumbnailToBucketMock.mockResolvedValue({ data: contentsId });
    createThumbnailMock.mockResolvedValue({ data: thumbnailDto });

    const { data, error } = await uploadAndCreateThumbnail({ thumbnailBuffer, fileUuid, environment, bucket });

    expect(error).toBeUndefined();
    expect(data).toStrictEqual(thumbnailDto);
    call(createThumbnailMock).toStrictEqual({
      fileUuid,
      type: 'png',
      size: thumbnailBuffer.length,
      maxWidth: THUMBNAIL_SIZE,
      maxHeight: THUMBNAIL_SIZE,
      bucketId: bucket,
      bucketFile: contentsId,
      encryptVersion: '03-aes',
    });
  });

  it('should return error when createThumbnail fails', async () => {
    const createError = new DriveServerError('SERVER_ERROR');
    uploadThumbnailToBucketMock.mockResolvedValue({ data: 'contents-id' });
    createThumbnailMock.mockResolvedValue({ error: createError });

    const { error } = await uploadAndCreateThumbnail({ thumbnailBuffer, fileUuid, environment, bucket });

    expect(error).toBe(createError);
  });
});
