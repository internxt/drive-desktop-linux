import { Environment } from '@internxt/inxt-js';
import { EventEmitter, Readable } from 'stream';
import { Stopwatch } from '../../../../../apps/shared/types/Stopwatch';
import { StorageFile } from '../../domain/StorageFile';
import { DownloadEvents, DownloaderHandler } from '../../domain/download/DownloaderHandler';
import { logger } from '@internxt/drive-desktop-core/build/backend';

export class EnvironmentContentFileDownloader implements DownloaderHandler {
  private eventEmitter: EventEmitter;
  private stopwatch: Stopwatch;
  private abortController: AbortController | null;

  constructor(
    private readonly environment: Environment,
    private readonly bucket: string,
  ) {
    this.eventEmitter = new EventEmitter();
    this.stopwatch = new Stopwatch();
    this.abortController = null;
  }

  forceStop(): void {
    this.abortController?.abort();
  }

  download(file: StorageFile): Promise<Readable> {
    return this.executeDownload(file.id.value);
  }

  downloadById(fileId: string): Promise<Readable> {
    return this.executeDownload(fileId);
  }

  private async executeDownload(fileId: string): Promise<Readable> {
    this.stopwatch.start();
    this.eventEmitter.emit('start');

    this.abortController = new AbortController();

    try {
      const stream = await new Promise<Readable>((resolve, reject) => {
        // Called directly rather than through `Reflect.apply`: that returned
        // `any`, so neither the options object nor the return value was checked
        // against `DownloadStrategyFunction`.
        const state = this.environment.download(
          this.bucket,
          fileId,
          {
            progressCallback: (progress: number) => {
              this.eventEmitter.emit('progress', progress, this.elapsedTime());
            },
            // The result channel. `DownloadOptions.finishedCallback` is
            // required, and this API returns an `ActionState` rather than a
            // Promise, so there was never a promise to await.
            finishedCallback: (err: Error | null, fileStream: Readable | null) => {
              if (err) {
                reject(err);
                return;
              }
              if (!(fileStream instanceof Readable)) {
                reject(new Error('Download stream not available'));
                return;
              }
              resolve(fileStream);
            },
          },
          {
            label: 'Dynamic',
            params: {
              useProxy: false,
              chunkSize: 4096 * 1024,
            },
          },
        );

        // Cancellation belongs to the returned `ActionState`. `abortSignal` is
        // not a member of `DownloadOptions`, so `forceStop()` previously
        // aborted a controller that nothing observed.
        this.abortController?.signal.addEventListener('abort', () => {
          this.environment.downloadCancel(state);
        });
      });

      this.eventEmitter.emit('finish', this.elapsedTime());

      return stream;
    } catch (err: unknown) {
      const downloadError = err instanceof Error ? err : new Error('Download failed');
      logger.error({ msg: 'Error in downloader', err: downloadError });
      this.eventEmitter.emit('error', downloadError);
      throw downloadError;
    } finally {
      this.stopwatch.finish();
      this.abortController = null;
    }
  }

  on(event: keyof DownloadEvents, handler: DownloadEvents[keyof DownloadEvents]): void {
    this.eventEmitter.on(event, handler);
    this.eventEmitter.on('finish', () => {
      this.eventEmitter.removeAllListeners();
    });
  }

  elapsedTime(): number {
    return this.stopwatch.elapsedTime();
  }
}
