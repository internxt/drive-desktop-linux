import { Service } from 'diod';
import { logger } from '@internxt/drive-desktop-core/build/backend';
import { SingleFileMatchingFinder } from '../../../../virtual-drive/files/application/SingleFileMatchingFinder';
import { FileStatuses } from '../../../../virtual-drive/files/domain/FileStatus';
import { StorageFile } from '../../domain/StorageFile';
import { StorageFileId } from '../../domain/StorageFileId';
import { StorageFilesRepository } from '../../domain/StorageFilesRepository';
import { StorageFileDownloader } from '../download/StorageFileDownloader/StorageFileDownloader';

@Service()
export class MakeStorageFileAvaliableOffline {
  constructor(
    private readonly repository: StorageFilesRepository,
    private readonly virtualFileFinder: SingleFileMatchingFinder,
    private readonly downloader: StorageFileDownloader,
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

    const { stream, metadata, handler } = await this.downloader.run(storage, virtual, {
      disableProgressTracking: true,
    });

    this.downloader.notifyDownloadStarted(metadata);

    await this.repository.store(storage, stream, {
      onProgress: (bytesWritten) => {
        const progress = Math.min(bytesWritten / virtual.size, 1);
        this.downloader.notifyDownloadProgress(metadata, progress, handler.elapsedTime());
      },
    });

    this.downloader.notifyDownloadFinished(metadata, handler);

    logger.debug({
      msg: `File "${virtual.nameWithExtension}" with ${storage.id.value} is now avaliable locally`,
    });
  }
}
