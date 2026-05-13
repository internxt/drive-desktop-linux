import { Environment } from '@internxt/inxt-js';
import { DriveDesktopError } from '../../../../context/shared/domain/errors/DriveDesktopError';
import { MULTIPART_UPLOAD_SIZE_THRESHOLD } from '../../../../context/shared/domain/UploadConstants';
import { createReadStream } from 'node:fs';
import { UploadStrategyFunction } from '@internxt/inxt-js/build/lib/core';
import { Result } from '../../../../context/shared/domain/Result';
import { logger } from '@internxt/drive-desktop-core/build/backend';
import { extractPropertyFromStringyfiedJson } from '../../../../shared/extract-property-from-json';
import { isError } from '../../../../shared/errors/is-error';
import { safeAccess } from '../../../../infra/local-file-system/safe-access';

export type ContentUploadParams = {
  path: string;
  size: number;
  bucket: string;
  environment: Environment;
  signal: AbortSignal;
};
function mapUploadError(err: Error & { code?: unknown; status?: unknown }): DriveDesktopError {
  if (err.code === 'EACCES' || err.code === 'EPERM') {
    return new DriveDesktopError('ACTION_NOT_PERMITTED', err.message);
  }
  if (err.message === 'Max space used') {
    return new DriveDesktopError('NOT_ENOUGH_SPACE');
  }
  if (typeof err.status === 'number') {
    if (err.status === 429) {
      const retryAfter = extractPropertyFromStringyfiedJson(err.message, 'retry_after');
      const retryAfterMs = typeof retryAfter === 'number' ? retryAfter * 1000 : 30_000;
      return new DriveDesktopError('RATE_LIMITED', String(retryAfterMs));
    }
    if (err.status >= 500) {
      return new DriveDesktopError('INTERNAL_SERVER_ERROR');
    }
  }
  return new DriveDesktopError('UNKNOWN');
}

export async function uploadContentToEnvironment({
  path,
  size,
  bucket,
  environment,
  signal,
}: ContentUploadParams): Promise<Result<string, DriveDesktopError>> {
  try {
    const uploadFn: UploadStrategyFunction =
      size > MULTIPART_UPLOAD_SIZE_THRESHOLD
        ? environment.uploadMultipartFile.bind(environment)
        : environment.upload.bind(environment);

    const accessResult = await safeAccess(path);
    if (accessResult.error) {
      return { error: accessResult.error };
    }

    const readable = createReadStream(path);

    return new Promise<Result<string, DriveDesktopError>>((resolve) => {
      let settled = false;
      const resolveOnce = (result: Result<string, DriveDesktopError>) => {
        if (settled) return;
        settled = true;
        resolve(result);
      };

      readable.on('error', (err: Error & { code?: unknown; status?: unknown }) => {
        logger.error({ tag: 'BACKUPS', msg: '[ENVLFU READ STREAM ERROR]', err, path });
        resolveOnce({ error: mapUploadError(err) });
      });

      const state = uploadFn(bucket, {
        source: readable,
        fileSize: size,
        finishedCallback: (err, contentsId) => {
          readable.close();

          if (err) {
            logger.error({ tag: 'BACKUPS', msg: '[ENVLFU UPLOAD ERROR]', err });
            return resolveOnce({ error: mapUploadError(err) });
          }

          if (!contentsId) {
            logger.error({ tag: 'BACKUPS', msg: '[ENVLFU UPLOAD ERROR] No contentsId returned' });
            return resolveOnce({ error: new DriveDesktopError('UNKNOWN') });
          }

          resolveOnce({ data: contentsId });
        },
        progressCallback: (progress: number) => {
          logger.debug({ tag: 'SYNC-ENGINE', msg: '[UPLOAD PROGRESS]', progress });
        },
      });

      signal.addEventListener(
        'abort',
        () => {
          state.stop();
          readable.destroy();
        },
        { once: true },
      );
    });
  } catch (err) {
    if (isError(err)) {
      return Promise.resolve({ error: mapUploadError(err) });
    }
    return Promise.resolve({ error: new DriveDesktopError('UNKNOWN') });
  }
}
