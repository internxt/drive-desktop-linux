import { Container } from 'diod';
import { logger } from '@internxt/drive-desktop-core/build/backend';
import { TemporalFileByPathFinder } from '../../../../context/storage/TemporalFiles/application/find/TemporalFileByPathFinder';
import { TemporalFileChunkReader } from '../../../../context/storage/TemporalFiles/application/read/TemporalFileChunkReader';
import { FirstsFileSearcher } from '../../../../context/virtual-drive/files/application/search/FirstsFileSearcher';
import { StorageFilesRepository } from '../../../../context/storage/StorageFiles/domain/StorageFilesRepository';
import { StorageFileId } from '../../../../context/storage/StorageFiles/domain/StorageFileId';
import { StorageFile } from '../../../../context/storage/StorageFiles/domain/StorageFile';
import { StorageFileDownloader } from '../../../../context/storage/StorageFiles/application/download/StorageFileDownloader/StorageFileDownloader';
import { DownloadProgressTracker } from '../../../../context/shared/domain/DownloadProgressTracker';
import { type File } from '../../../../context/virtual-drive/files/domain/File';
import {
  handleReadCallback,
  type HandleReadCallbackDeps,
} from '../../../../backend/features/fuse/on-read/handle-read-callback';

import Fuse from '@gcas/fuse';

export class ReadCallback {
  constructor(private readonly container: Container) {}

  async execute(
    path: string,
    _fd: any,
    buf: Buffer,
    len: number,
    pos: number,
    cb: (code: number, params?: any) => void,
  ) {
    try {
      const repo = this.container.get(StorageFilesRepository);
      const downloader = this.container.get(StorageFileDownloader);
      const tracker = this.container.get(DownloadProgressTracker);

      const deps: HandleReadCallbackDeps = {
        findVirtualFile: (p: string) => this.container.get(FirstsFileSearcher).run({ path: p }),
        findTemporalFile: (p: string) => this.container.get(TemporalFileByPathFinder).run(p),
        readTemporalFileChunk: async (p: string, length: number, position: number) => {
          const result = await this.container.get(TemporalFileChunkReader).run(p, length, position);
          return result.isPresent() ? result.get() : undefined;
        },
        existsOnDisk: (contentsId: string) => repo.exists(new StorageFileId(contentsId)),

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
        saveToRepository: async (virtualFile: File) => {
          const storage = StorageFile.from({
            id: virtualFile.contentsId,
            virtualId: virtualFile.uuid,
            size: virtualFile.size,
          });
          await repo.register(storage);
          tracker.downloadFinished(virtualFile.name, virtualFile.type);
        },
      };

      const result = await handleReadCallback(deps, path, len, pos);

      if (result.isLeft()) {
        cb(result.getLeft().code);
        return;
      }

      const chunk = result.getRight();
      chunk.copy(buf as unknown as Uint8Array);
      cb(chunk.length);
    } catch (err) {
      logger.error({ msg: '[ReadCallback] Error reading file:', error: err, path });
      cb(Fuse.EIO);
    }
  }
}
