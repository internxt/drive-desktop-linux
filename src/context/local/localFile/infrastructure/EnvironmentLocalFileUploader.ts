import { UploadStrategyFunction } from '@internxt/inxt-js/build/lib/core';
import { Service } from 'diod';
import { createReadStream } from 'fs';
import { Stopwatch } from '../../../../apps/shared/types/Stopwatch';
import { AbsolutePath } from './AbsolutePath';
import { LocalFileHandler } from '../domain/LocalFileUploader';
import { Environment } from '@internxt/inxt-js';
import { Axios } from 'axios';
import Logger from 'electron-log';

@Service()
export class EnvironmentLocalFileUploader implements LocalFileHandler {
  private static MULTIPART_UPLOAD_SIZE_THRESHOLD = 5 * 1024 * 1024 * 1024;

  constructor(
    private readonly environment: Environment,
    private readonly bucket: string,
    private readonly httpClient: Axios
  ) {}

  upload(
    path: AbsolutePath,
    size: number,
    abortSignal: AbortSignal
  ): Promise<string> {
    const fn: UploadStrategyFunction =
      size > EnvironmentLocalFileUploader.MULTIPART_UPLOAD_SIZE_THRESHOLD
        ? this.environment.uploadMultipartFile
        : this.environment.upload;

    const readable = createReadStream(path);

    const stopwatch = new Stopwatch();

    stopwatch.start();

    return new Promise((resolve, reject) => {
      const state = fn(this.bucket, {
        source: readable,
        fileSize: size,
        finishedCallback: (err: Error | null, contentsId: string) => {
          stopwatch.finish();

          if (err) {
            return reject(err);
          }
          resolve(contentsId);
        },
        progressCallback: (_progress: number) => {
          //
        },
      });

      abortSignal.addEventListener('abort', () => {
        state.stop();
        readable.destroy();
      });
    });
  }

  async delete(contentsId: string): Promise<void> {
    try {
      await this.httpClient.delete(
        `${process.env.API_URL}/api/storage/bucket/${this.bucket}/file/${contentsId}`
      );
    } catch (error) {
      // Not being able to delete from the bucket is not critical
      Logger.error('Could not delete the file from the bucket');
    }
  }
}
