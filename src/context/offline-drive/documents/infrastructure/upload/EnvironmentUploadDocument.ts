import { Environment } from '@internxt/inxt-js';
import { Service } from 'diod';
import Logger from 'electron-log';
import { Readable } from 'stream';
import { UploadProgressTracker } from '../../../../shared/domain/UploadProgressTracker';
import { EnvironmentOfflineContentsUploader } from '../../../contents/infrastructure/EnvironmentOfflineContentsUploader';

@Service()
export class EnvironmentDocumentUploader {
  private static MULTIPART_UPLOAD_SIZE_THRESHOLD = 5 * 1024 * 1024 * 1024;

  constructor(
    private readonly environment: Environment,
    private readonly bucket: string,
    private readonly progressTracker: UploadProgressTracker
  ) {}

  uploader(
    stream: Readable,
    size: number,
    {
      name,
      extension,
    }: {
      name: string;
      extension: string;
    },
    abortSignal?: AbortSignal
  ) {
    const fn =
      size > EnvironmentDocumentUploader.MULTIPART_UPLOAD_SIZE_THRESHOLD
        ? this.environment.uploadMultipartFile
        : this.environment.upload;

    const uploader = new EnvironmentOfflineContentsUploader(
      fn,
      this.bucket,
      abortSignal
    );

    uploader.on('start', () => {
      this.progressTracker.uploadStarted(name, extension, size);
    });

    uploader.on('progress', (progress: number) => {
      this.progressTracker.uploadProgress(name, extension, size, {
        elapsedTime: uploader.elapsedTime(),
        percentage: progress,
      });
    });

    uploader.on('error', (error: Error) => {
      // TODO: use error to determine the cause
      Logger.debug('UPLOADER ERROR', error);
      this.progressTracker.uploadError(name, extension, 'UNKNOWN');
    });

    uploader.on('finish', () => {
      this.progressTracker.uploadCompleted(name, extension, size, {
        elapsedTime: uploader.elapsedTime(),
      });
    });

    return () => uploader.upload(stream, size);
  }
}
