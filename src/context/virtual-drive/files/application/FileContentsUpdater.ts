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
    Logger.info(`[REUPLOADING FILE] ${attributes.contentsId}`);
    await this.remote.trash(attributes.contentsId); //TODO: Change to delete

    const signal = AbortSignal.timeout(10000);

    // Create new file, upload it to the bucket and persist it with the new content id
    const contentEither = await this.fileUploader.upload(
      attributes.path as AbsolutePath,
      attributes.size,
      signal
    );
    if (contentEither.isRight()) {
      const contentsId = contentEither.getRight();
      const file = File.from(attributes);
      await this.remote.persist({
        contentsId: new FileContentsId(contentsId),
        path: new FilePath(file.path),
        size: new FileSize(file.size),
        folderId: new FileFolderId(file.folderId),
      });
    }
  }
}
