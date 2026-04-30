import { Container } from 'diod';
import { type Result } from '../../../../../context/shared/domain/Result';
import { FuseError } from '../../../../../apps/drive/fuse/callbacks/FuseErrors';
import { FuseCodes } from '../../../../../apps/drive/fuse/callbacks/FuseCodes';
import { FirstsFileSearcher } from '../../../../../context/virtual-drive/files/application/search/FirstsFileSearcher';
import { TemporalFileByPathFinder } from '../../../../../context/storage/TemporalFiles/application/find/TemporalFileByPathFinder';
import { StorageFilesRepository } from '../../../../../context/storage/StorageFiles/domain/StorageFilesRepository';
import { StorageFileId } from '../../../../../context/storage/StorageFiles/domain/StorageFileId';
import { StorageFile } from '../../../../../context/storage/StorageFiles/domain/StorageFile';
import { StorageFileDownloader } from '../../../../../context/storage/StorageFiles/application/download/StorageFileDownloader/StorageFileDownloader';
import { DownloadProgressTracker } from '../../../../../context/shared/domain/DownloadProgressTracker';
import { handleReadCallback } from '../../../../features/fuse/on-read/handle-read-callback';
import { logger } from '@internxt/drive-desktop-core/build/backend';
import { type File } from '../../../../../context/virtual-drive/files/domain/File';

export async function read(
  path: string,
  length: number,
  position: number,
  processName: string,
  container: Container,
): Promise<Result<Buffer, FuseError>> {
  try {
    const repo = container.get(StorageFilesRepository);
    const downloader = container.get(StorageFileDownloader);
    const tracker = container.get(DownloadProgressTracker);

    return await handleReadCallback(
      {
        findVirtualFile: (p) => container.get(FirstsFileSearcher).run({ path: p }),
        findTemporalFile: (p) => container.get(TemporalFileByPathFinder).run(p),
        existsOnDisk: (contentsId) => repo.exists(new StorageFileId(contentsId)),
        startDownload: async (virtualFile: File) => {
          const storage = StorageFile.from({
            id: virtualFile.contentsId,
            virtualId: virtualFile.uuid,
            size: virtualFile.size,
          });
          tracker.downloadStarted(virtualFile.name, virtualFile.type);
          const { stream, handler } = await downloader.run(storage, virtualFile);
          return { stream, elapsedTime: () => handler.elapsedTime() };
        },
        onDownloadProgress: (name, extension, progress) => {
          tracker.downloadUpdate(name, extension, progress);
        },
        saveToRepository: async (contentsId, size, uuid, name, extension) => {
          const storage = StorageFile.from({
            id: contentsId,
            virtualId: uuid,
            size,
          });
          await repo.register(storage);
          tracker.downloadFinished(name, extension);
        },
      },
      path,
      length,
      position,
      processName,
    );
  } catch (err) {
    logger.error({ msg: '[FUSE - Read] Unexpected error', error: err, path });
    return { error: new FuseError(FuseCodes.EIO, `[FUSE - Read] IO error: ${path}`) };
  }
}
