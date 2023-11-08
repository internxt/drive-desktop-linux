import { ContentsManagersFactory } from '../domain/ContentsManagersFactory';
import { SyncEngineIpc } from '../../../ipcRendererSyncEngine';
import { ContentFileDownloader } from '../domain/contentHandlers/ContentFileDownloader';
import { File } from '../../files/domain/File';
import { LocalFileContents } from '../domain/LocalFileContents';
import { LocalFileWriter } from '../domain/LocalFileWriter';
import { ensureFolderExists } from '../../../../../shared/fs/ensure-folder-exists';
import path from 'path';
import { CallbackDownload } from '../../../BindingManager';
import { TemporalFolderProvider } from './temporalFolderProvider';
import { EventBus } from '../../shared/domain/EventBus';
import Logger from 'electron-log';
import { Readable } from 'stream';

export class ContentsDownloader {
  private readableDownloader: Readable | null;
  constructor(
    private readonly managerFactory: ContentsManagersFactory,
    private readonly localWriter: LocalFileWriter,
    private readonly ipc: SyncEngineIpc,
    private readonly temporalFolderProvider: TemporalFolderProvider,
    private readonly eventBus: EventBus
  ) {
    this.readableDownloader = null;
  }

  private async registerEvents(
    downloader: ContentFileDownloader,
    file: File,
    cb: CallbackDownload
  ) {
    const location = await this.temporalFolderProvider();
    const folderPath = path.join(location, 'internxt');
    ensureFolderExists(folderPath);
    const filePath = path.join(folderPath, file.nameWithExtension);

    downloader.on('start', () => {
      this.ipc.send('FILE_DOWNLOADING', {
        name: file.name,
        extension: file.type,
        nameWithExtension: file.nameWithExtension,
        size: file.size,
        processInfo: { elapsedTime: downloader.elapsedTime(), progress: 0 },
      });
    });

    downloader.on('progress', async () => {
      const result = await cb(true, filePath);
      const hydrationProgress = result.progress;
      Logger.debug(
        '\n\n******************************************hydrationProgress : \n\n',
        hydrationProgress
      );

      if (result.finished) {
        downloader.forceStop();
        Logger.debug('Downloader force stop', this.readableDownloader);
        this.readableDownloader?.destroy();
        this.readableDownloader?.emit('close');
        this.ipc.send('FILE_DOWNLOADED', {
          name: file.name,
          extension: file.type,
          nameWithExtension: file.nameWithExtension,
          size: file.size,
          processInfo: { elapsedTime: downloader.elapsedTime() },
        });
      } else {
        this.ipc.send('FILE_DOWNLOADING', {
          name: file.name,
          extension: file.type,
          nameWithExtension: file.nameWithExtension,
          size: file.size,
          processInfo: {
            elapsedTime: downloader.elapsedTime(),
            progress: hydrationProgress,
          },
        });
      }
    });

    downloader.on('error', (error: Error) => {
      this.ipc.send('FILE_DOWNLOAD_ERROR', {
        name: file.name,
        extension: file.type,
        nameWithExtension: file.nameWithExtension,
        error: error.message,
      });
    });

    downloader.on('finish', () => {
      Logger.error('INSIDE FINISH=======================');
      // The file download being finished does not mean it has been hidratated
      // TODO: We might want to track this time instead of the whole completion time
      this.ipc.send('FILE_DOWNLOADED', {
        name: file.name,
        extension: file.type,
        nameWithExtension: file.nameWithExtension,
        size: file.size,
        processInfo: { elapsedTime: downloader.elapsedTime() },
      });
    });
  }

  async run(file: File, cb: CallbackDownload): Promise<string> {
    const downloader = this.managerFactory.downloader();

    this.registerEvents(downloader, file, cb);

    const readable = await downloader.download(file);
    this.readableDownloader = readable;
    const localContents = LocalFileContents.downloadedFrom(
      file,
      readable,
      downloader.elapsedTime()
    );

    const write = await this.localWriter.write(localContents);

    const events = localContents.pullDomainEvents();
    await this.eventBus.publish(events);

    return write;
  }
}
