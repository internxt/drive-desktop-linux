import { Environment } from '@internxt/inxt-js';
import { Readable } from 'node:stream';
import { Result } from '../../../context/shared/domain/Result';
import { UPLOAD_TIMEOUT_MS } from './thumbnail.constants';



export function uploadThumbnailToBucket(
  environment: Environment,
  bucket: string,
  buffer: Buffer,
): Promise<Result<string, Error>> {
  const source = Readable.from(buffer);
  const fileSize = buffer.length;

  let timeoutId: ReturnType<typeof setTimeout>;

  const upload = new Promise<Result<string, Error>>((resolve) => {
    environment.upload(bucket, {
      source,
      fileSize,
      finishedCallback: (err: Error | null, contentsId: string | null) => {
        clearTimeout(timeoutId);
        if (err) {
          return resolve({ error: err });
        }
        if (!contentsId) {
          return resolve({ error: new Error('Upload succeeded but no contentsId returned') });
        }
        resolve({ data: contentsId });
      },
      progressCallback: () => {},
    });
  });

  const timeout = new Promise<Result<string, Error>>((resolve) => {
    timeoutId = setTimeout(() => resolve({ error: new Error('Thumbnail bucket upload timed out') }), UPLOAD_TIMEOUT_MS);
  });

  return Promise.race([upload, timeout]);
}
