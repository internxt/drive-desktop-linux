import { Service } from 'diod';
import Logger from 'electron-log';
import { DownloadProgressTracker } from '../../../shared/domain/DownloadProgressTracker';
import { File } from '../../files/domain/File';
import { ContentsManagersFactory } from '../domain/ContentsManagersFactory';
import { ContentFileDownloader } from '../domain/contentHandlers/ContentFileDownloader';
import { Readable } from 'stream';

@Service()
export class FileDownloader {
  constructor(
    private readonly managerFactory: ContentsManagersFactory,
    private readonly tracker: DownloadProgressTracker
  ) {}

  private async registerEvents(downloader: ContentFileDownloader, file: File) {
    downloader.on('start', () => {
      this.tracker.downloadStarted(file.name, file.type, file.size);
    });

    downloader.on('progress', (progress: number, elapsedTime: number) => {
      this.tracker.downloadUpdate(file.name, file.type, {
        elapsedTime,
        percentage: progress,
      });
    });

    downloader.on('error', () => {
      this.tracker.error(file.name, file.type);
    });
  }

  async run(file: File): Promise<Readable> {
    Logger.debug(`downloading "${file.nameWithExtension}"`);

    const downloader = this.managerFactory.downloader();

    this.registerEvents(downloader, file);

    return await downloader.download(file);
  }
}
