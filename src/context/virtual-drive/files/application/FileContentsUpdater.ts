import { RemoteFileSystem } from '../domain/file-systems/RemoteFileSystem';
import { FileAttributes, File } from '../domain/File';
import { FileContentsId } from '../domain/FileContentsId';
import { FileFolderId } from '../domain/FileFolderId';
import { FilePath } from '../domain/FilePath';
import { FileSize } from '../domain/FileSize';
import Logger from 'electron-log';
import { Service } from 'diod';
import { LocalFileHandler } from '../../../local/localFile/domain/LocalFileUploader';
import { AbsolutePath } from '../../../local/localFile/infrastructure/AbsolutePath';

@Service()
export class FileContentsUpdater {
  constructor(
    private readonly remote: RemoteFileSystem,
    private readonly fileUploader: LocalFileHandler
  ) {}

  async hardUpdateRun(attributes: FileAttributes): Promise<void> {
    Logger.info(
      `[DANGLING FILE] attempting to reupload ${attributes.contentsId}`
    );
    try {

      const signal = AbortSignal.timeout(42949672);
      const newFilPath = new FilePath(attributes.path);
      // Create new file, upload it to the bucket and persist it with the new content id
      const contentEither = await this.fileUploader.upload(
        newFilPath.name() as unknown as AbsolutePath,
        attributes.size,
        signal
      );
      if (contentEither.isLeft()) {
        const error = contentEither.getLeft();
        Logger.error(`[DANGLING FILE] error uploading file ${attributes.contentsId} with error: ${error}`);
      }

      if (contentEither.isRight()) {
        Logger.info(`[DANGLING FILE] uploaded ${attributes.contentsId}`);
        await this.remote.hardDelete(attributes.contentsId);
        const contentsId = contentEither.getRight();
        const file = File.from({...attributes, contentsId});
        await this.remote.persist({
          contentsId: new FileContentsId(file.contentsId),
          path: new FilePath(file.path),
          size: new FileSize(file.size),
          folderId: new FileFolderId(file.folderId),
        });
        Logger.info(`[DANGLING FILE] persisted ${attributes.contentsId}`);
      }
    } catch (error) {
      Logger.error(`[DANGLING FILE] error updating file ${attributes.contentsId} with error: ${error}`);
    }
  }
}
