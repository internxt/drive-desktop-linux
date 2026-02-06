import { Service } from 'diod';
import { logger } from '@internxt/drive-desktop-core/build/backend';
import { SingleFileMatchingFinder } from '../../../../virtual-drive/files/application/SingleFileMatchingFinder';
import { FileStatuses } from '../../../../virtual-drive/files/domain/FileStatus';
import { StorageFile } from '../../domain/StorageFile';
import { StorageFileId } from '../../domain/StorageFileId';
import { StorageFileDownloader } from '../download/StorageFileDownloader/StorageFileDownloader';
import { StorageFileCache } from '../../domain/StorageFileCache';

@Service()
export class CacheStorageFile {
  constructor(
    private readonly virtualFileFinder: SingleFileMatchingFinder,
    private readonly cache: StorageFileCache,
    private readonly downloader: StorageFileDownloader,
  ) {}

  async run(path: string) {
    const virtual = await this.virtualFileFinder.run({
      path,
      status: FileStatuses.EXISTS,
    });

    if (virtual.size === 0) {
      logger.debug({
        msg: `File "${virtual.nameWithExtension}" has size 0, skipping download`,
      });
      return;
    }

    const id = new StorageFileId(virtual.contentsId);

    const alreadyExists = await this.cache.has(id);

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

    await this.cache.pipe(id, stream, {
      onProgress: (bytesWritten) => {
        const progress = Math.min(bytesWritten / virtual.size, 1);
        this.downloader.notifyDownloadProgress(metadata, progress, handler.elapsedTime());
      },
    });

    this.downloader.notifyDownloadFinished(metadata, handler);

    logger.debug({
      msg: `File "${virtual.nameWithExtension}" with ${storage.id.value} is cached`,
    });
  }
}
