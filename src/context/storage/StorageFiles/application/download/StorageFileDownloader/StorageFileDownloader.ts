import { Service } from 'diod';
import Logger from 'electron-log';
import { Readable } from 'stream';
import { DownloadProgressTracker } from '../../../../../shared/domain/DownloadProgressTracker';
import { DownloaderHandlerFactory } from '../../../domain/download/DownloaderHandlerFactory';
import { DownloaderHandler } from '../../../domain/download/DownloaderHandler';
import { StorageFile } from '../../../domain/StorageFile';
import { Either, left, right } from '../../../../../shared/domain/Either';

@Service()
export class StorageFileDownloader {
  constructor(
    private readonly managerFactory: DownloaderHandlerFactory,
    private readonly tracker: DownloadProgressTracker
  ) {}

  private async registerEvents(
    handler: DownloaderHandler,
    { name, type, size }: { name: string; type: string; size: number }
  ) {
    handler.on('start', () => {
      this.tracker.downloadStarted(name, type, size);
    });

    handler.on('progress', (progress: number, elapsedTime: number) => {
      this.tracker.downloadUpdate(name, type, {
        elapsedTime,
        percentage: progress,
      });
    });

    handler.on('error', () => {
      this.tracker.error(name, type);
    });

    handler.on('finish', () => {
      this.tracker.downloadFinished(name, type, size, {
        elapsedTime: handler.elapsedTime(),
      });
    });
}

  async run(
    file: StorageFile,
    metadata: {
      name: string;
      type: string;
      size: number;
    }
  ): Promise<Readable> {
    const downloader = this.managerFactory.downloader();

    await this.registerEvents(downloader, metadata);

    const stream = await downloader.download(file);

    Logger.debug(
      `stream created "${metadata.name}.${metadata.type}" with ${file.id.value}`
    );

    return stream;
  }

  async isFileDownloadable(fileContentsId: string): Promise<Either<Error, boolean>> {
    const downloader = this.managerFactory.downloader();

    return new Promise<Either<Error, boolean>>(async (resolve) => {
      try {
        this.registerEventsforIsFileDownloadable(downloader, fileContentsId, resolve);
        await downloader.downloadById(fileContentsId);
      } catch (error) {
        Logger.error(`[DOWNLOAD] Error downloading file ${fileContentsId}: ${error}`);
        resolve(left(error instanceof Error ? error : new Error(String(error))));
      }
    });
  }

  private async registerEventsforIsFileDownloadable(
    handler: DownloaderHandler,
    fileId: string,
    resolve: (result: Either<Error, boolean>) => void
  ) {
    handler.on('start', () => {
      Logger.info(`Starting download for file ${fileId}`);
    });

    handler.on('progress', async () => {
      Logger.info(`File ${fileId} is downloadable, stopping download...`);
      handler.forceStop();
      resolve(right(true));
    });

    handler.on('error', (error: Error) => {
      if (error.message.includes('Object not found') || error.message.includes('404')) {
        Logger.error(`[DOWNLOAD CHECK] file not found ${fileId}: ${error.message}`);
        resolve(right(false));
      } else {
        Logger.error(`[DOWNLOAD CHECK] Uncontrolled Error downloading file ${fileId}: ${error.message}`);
        resolve(left(error));
      }
      handler.forceStop();
    });

    handler.on('finish', () => {
      Logger.info(`File ${fileId} finish downloading`);
      resolve(right(true));
      handler.forceStop();
    });
  }
}
