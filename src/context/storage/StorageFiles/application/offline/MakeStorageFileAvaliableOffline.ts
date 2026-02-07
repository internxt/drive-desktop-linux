import { Service } from 'diod';
import { logger } from '@internxt/drive-desktop-core/build/backend';
import { SingleFileMatchingFinder } from '../../../../virtual-drive/files/application/SingleFileMatchingFinder';
import { FileStatuses } from '../../../../virtual-drive/files/domain/FileStatus';
import { StorageFile } from '../../domain/StorageFile';
import { StorageFileId } from '../../domain/StorageFileId';
import { StorageFilesRepository } from '../../domain/StorageFilesRepository';
import { StorageFileDownloader } from '../download/StorageFileDownloader/StorageFileDownloader';
import { DownloadProgressTracker } from '../../../../shared/domain/DownloadProgressTracker';

@Service()
export class MakeStorageFileAvaliableOffline {
  constructor(
    private readonly repository: StorageFilesRepository,
    private readonly virtualFileFinder: SingleFileMatchingFinder,
    private readonly downloader: StorageFileDownloader,
    private readonly tracker: DownloadProgressTracker,
  ) {}

  async run(path: string) {
    const virtual = await this.virtualFileFinder.run({
      path,
      status: FileStatuses.EXISTS,
    });

    const id = new StorageFileId(virtual.contentsId);

    const alreadyExists = await this.repository.exists(id);

    if (alreadyExists) {
      return;
    }

    const storage = StorageFile.from({
      id: virtual.contentsId,
      virtualId: virtual.uuid,
      size: virtual.size,
    });

    this.tracker.downloadStarted(virtual.name, virtual.type);
    const { stream, metadata, handler } = await this.downloader.run(storage, virtual);

    await this.repository.store(storage, stream, (bytesWritten) => {
      const percentage = Math.min(bytesWritten / virtual.size, 1);
      this.tracker.downloadUpdate(metadata.name, metadata.type, { percentage, elapsedTime: handler.elapsedTime() });
    });

    this.tracker.downloadFinished(metadata.name, metadata.type);

    logger.debug({
      msg: `File "${virtual.nameWithExtension}" with ${storage.id.value} is now avaliable locally`,
    });
  }
}
