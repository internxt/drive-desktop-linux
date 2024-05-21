import { UploadStrategyFunction } from '@internxt/inxt-js/build/lib/core';
import { Service } from 'diod';
import { createReadStream } from 'fs';
import { Stopwatch } from '../../../../apps/shared/types/Stopwatch';
import { LocalFile } from '../../localFile/domain/LocalFile';
import { RemoteFileRepository } from '../domain/RemoteFileRepository';
import { AbsolutePath } from '../../localFile/infrastructure/AbsolutePath';

@Service()
export class EnvironmentRemoteFileRepository implements RemoteFileRepository {
  constructor(
    private readonly fn: UploadStrategyFunction,
    private readonly bucket: string
  ) {}

  upload(
    path: AbsolutePath,
    size: number,
    abortSignal: AbortSignal
  ): Promise<void> {
    const readable = createReadStream(path);

    const stopwatch = new Stopwatch();

    stopwatch.start();

    return new Promise((resolve, reject) => {
      const state = this.fn(this.bucket, {
        source: readable,
        fileSize: size,
        finishedCallback: (err: Error | null, _contentsId: string) => {
          stopwatch.finish();

          if (err) {
            return reject(err);
          }
          resolve();
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
}
