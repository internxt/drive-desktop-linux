import { Service } from 'diod';
import { SingleFileMatchingSearcher } from '../../../../virtual-drive/files/application/search/SingleFileMatchingSearcher';
import { FileStatuses } from '../../../../virtual-drive/files/domain/FileStatus';
import { StorageFile } from '../../domain/StorageFile';
import { StorageFilesRepository } from '../../domain/StorageFilesRepository';
import { StorageFileDownloader } from '../download/StorageFileDownloader/StorageFileDownloader';
import { logger } from '@internxt/drive-desktop-core/build/backend';
import { DownloadProgressTracker } from '../../../../shared/domain/DownloadProgressTracker';

@Service()
export class StorageRemoteChangesSyncher {
  constructor(
    private readonly repository: StorageFilesRepository,
    private readonly fileSearcher: SingleFileMatchingSearcher,
    private readonly downloader: StorageFileDownloader,
    private readonly tracker: DownloadProgressTracker,
  ) {}

  private async sync(storage: StorageFile): Promise<void> {
    const virtualFile = await this.fileSearcher.run({
      uuid: storage.virtualId.value,
      status: FileStatuses.EXISTS,
    });

    if (!virtualFile) {
      await this.repository.delete(storage.id);
      return;
    }

    if (virtualFile.contentsId === storage.id.value) {
      return;
    }

    await this.repository.delete(storage.id);

    const newer = StorageFile.from({
      id: virtualFile.contentsId,
      virtualId: storage.virtualId.value,
      size: virtualFile.size,
    });

    this.tracker.downloadStarted(virtualFile.name, virtualFile.type);
    const { stream, metadata, handler } = await this.downloader.run(newer, virtualFile);

    await this.repository.store(newer, stream, (bytesWritten) => {
      const progress = Math.min(bytesWritten / virtualFile.size, 1);
      this.tracker.downloadUpdate(metadata.name, metadata.type, {
        percentage: progress,
        elapsedTime: handler.elapsedTime(),
      });
    });

    this.tracker.downloadFinished(metadata.name, metadata.type);

    logger.debug({
      msg: `File "${virtualFile.nameWithExtension}" with ${newer.id.value} is avaliable offline`,
    });
  }

  async run(): Promise<void> {
    const all = await this.repository.all();

    const synced = all.map(this.sync.bind(this));

    await Promise.all(synced);
  }
}
