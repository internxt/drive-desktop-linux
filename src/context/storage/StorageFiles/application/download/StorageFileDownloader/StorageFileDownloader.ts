import { Service } from 'diod';
import { logger } from '@internxt/drive-desktop-core/build/backend';
import { Readable } from 'stream';
import { DownloadProgressTracker } from '../../../../../shared/domain/DownloadProgressTracker';
import { DownloaderHandlerFactory } from '../../../domain/download/DownloaderHandlerFactory';
import { DownloaderHandler } from '../../../domain/download/DownloaderHandler';
import { StorageFile } from '../../../domain/StorageFile';

@Service()
export class StorageFileDownloader {
  constructor(
    private readonly managerFactory: DownloaderHandlerFactory,
    private readonly tracker: DownloadProgressTracker,
  ) {}

  private async registerEvents(
    handler: DownloaderHandler,
    { name, type, size }: { name: string; type: string; size: number },
    options?: { disableProgressTracking?: boolean },
  ) {
    if (!options?.disableProgressTracking) {
      handler.on('start', () => {
        this.tracker.downloadStarted(name, type, size);
      });

      handler.on('progress', (progress: number, elapsedTime: number) => {
        this.tracker.downloadUpdate(name, type, {
          elapsedTime,
          percentage: progress,
        });
      });
    }

    handler.on('error', () => {
      this.tracker.error(name, type);
    });
  }

  async run(
    file: StorageFile,
    metadata: {
      name: string;
      type: string;
      size: number;
    },
    options?: { disableProgressTracking?: boolean },
  ): Promise<{ stream: Readable; metadata: typeof metadata; handler: DownloaderHandler }> {
    const downloader = this.managerFactory.downloader();

    await this.registerEvents(downloader, metadata, options);

    const stream = await downloader.download(file);

    logger.debug({
      msg: `stream created "${metadata.name}.${metadata.type}" with ${file.id.value}`,
    });

    return { stream, metadata, handler: downloader };
  }

  notifyDownloadStarted(metadata: { name: string; type: string; size: number }): void {
    this.tracker.downloadStarted(metadata.name, metadata.type, metadata.size);
  }

  notifyDownloadProgress(metadata: { name: string; type: string }, progress: number, elapsedTime: number): void {
    this.tracker.downloadUpdate(metadata.name, metadata.type, {
      elapsedTime,
      percentage: progress,
    });
  }

  notifyDownloadFinished(metadata: { name: string; type: string; size: number }, handler: DownloaderHandler): void {
    this.tracker.downloadFinished(metadata.name, metadata.type);
  }
}
