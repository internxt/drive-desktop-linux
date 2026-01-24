import { Environment } from '@internxt/inxt-js';
import { DriveDesktopError } from '../../../../context/shared/domain/errors/DriveDesktopError';
import { MULTIPART_UPLOAD_SIZE_THRESHOLD } from '../../../../context/shared/domain/UploadConstants';
import { createReadStream } from 'node:fs';
import { UploadStrategyFunction } from '@internxt/inxt-js/build/lib/core';
import { Result } from '../../../../context/shared/domain/Result';
import { logger } from '@internxt/drive-desktop-core/build/backend';

export type ContentUploadParams = {
  path: string;
  size: number;
  bucket: string;
  environment: Environment;
  signal: AbortSignal;
};

/**
 * Upload file content to storage bucket (Environment)
 * Returns contentsId on success
 *
 */
export function uploadContentToEnvironment({
  path,
  size,
  bucket,
  environment,
  signal,
}: ContentUploadParams): Promise<Result<string, DriveDesktopError>> {
  const uploadFn: UploadStrategyFunction =
    size > MULTIPART_UPLOAD_SIZE_THRESHOLD
      ? environment.uploadMultipartFile.bind(environment)
      : environment.upload.bind(environment);

  const readable = createReadStream(path);

  return new Promise((resolve) => {
    const state = uploadFn(bucket, {
      source: readable,
      fileSize: size,
      finishedCallback: (err, contentsId) => {
        readable.close();

        if (err) {
          logger.error({ tag: 'BACKUPS', msg: '[ENVLFU UPLOAD ERROR]', err });
          if (err.message === 'Max space used') {
            return resolve({ error: new DriveDesktopError('NOT_ENOUGH_SPACE') });
          }
          return resolve({ error: new DriveDesktopError('UNKNOWN') });
        }

        if (!contentsId) {
          logger.error({ tag: 'BACKUPS', msg: '[ENVLFU UPLOAD ERROR] No contentsId returned' });
          return resolve({ error: new DriveDesktopError('UNKNOWN') });
        }

        resolve({ data: contentsId });
      },
      progressCallback: (progress: number) => {
        logger.debug({ tag: 'SYNC-ENGINE', msg: '[UPLOAD PROGRESS]', progress });
      },
    });

    signal.addEventListener('abort', () => {
      state.stop();
      readable.destroy();
    });
  });
}
