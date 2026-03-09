import { Environment } from '@internxt/inxt-js';
import { uploadThumbnailToBucket } from './upload-thumbnail-to-bucket';
import { UPLOAD_TIMEOUT_MS } from './thumbnail.constants';
import { UploadOptions } from '@internxt/inxt-js/build/lib/core';

function environmentMock(upload: (bucket: string, options: UploadOptions) => void): Environment {
  return { upload } as unknown as Environment;
}

describe('upload-thumbnail-to-bucket', () => {
  const bucket = 'test-bucket';
  const buffer = Buffer.from('image-data');
  const clearTimeoutMock = vi.spyOn(global, 'clearTimeout');

  it('should return data with contentsId on successful upload', async () => {
    const contentsId = 'contents-id-123';
    const environment = environmentMock((_bucket, { finishedCallback }) => {
      finishedCallback(null, contentsId);
    });

    const { data, error } = await uploadThumbnailToBucket(environment, bucket, buffer);

    expect(error).toBeUndefined();
    expect(data).toBe(contentsId);
    expect(clearTimeoutMock).toHaveBeenCalled();
  });

  it('should return error when finishedCallback receives an error', async () => {
    const uploadError = new Error('bucket error');
    const environment = environmentMock((_bucket, { finishedCallback }) => {
      finishedCallback(uploadError, null);
    });

    const { error } = await uploadThumbnailToBucket(environment, bucket, buffer);

    expect(error).toBe(uploadError);
    expect(clearTimeoutMock).toHaveBeenCalled();
  });

  it('should return error when finishedCallback has no contentsId', async () => {
    const environment = environmentMock((_bucket, { finishedCallback }) => {
      finishedCallback(null, null);
    });

    const { error } = await uploadThumbnailToBucket(environment, bucket, buffer);

    expect(error).toBeInstanceOf(Error);
    expect(clearTimeoutMock).toHaveBeenCalled();
  });

  it('should return error when upload times out', async () => {
    vi.useFakeTimers();

    const environment = environmentMock(() => {
      // never calls finishedCallback
    });

    const resultPromise = uploadThumbnailToBucket(environment, bucket, buffer);
    vi.advanceTimersByTime(UPLOAD_TIMEOUT_MS);

    const { error } = await resultPromise;

    expect(error).toBeInstanceOf(Error);

    vi.useRealTimers();
  });
});
