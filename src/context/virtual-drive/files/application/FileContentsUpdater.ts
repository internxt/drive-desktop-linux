import { RemoteFileSystem } from '../domain/file-systems/RemoteFileSystem';
import { FileAttributes, File } from '../domain/File';
import { FileContentsId } from '../domain/FileContentsId';
import { FileFolderId } from '../domain/FileFolderId';
import { FilePath } from '../domain/FilePath';
import { FileSize } from '../domain/FileSize';
import Logger from 'electron-log';
import { Service } from 'diod';

@Service()
export class FileContentsUpdater {
  constructor(private readonly remote: RemoteFileSystem) {}

  async hardUpdateRun(Attributes: FileAttributes): Promise<void> {
    Logger.info(`[REUPLOADING FILE] ${Attributes.contentsId}`);
    await this.remote.trash(Attributes.contentsId);

    const file = File.from(Attributes);
    await this.remote.persist({
      contentsId: new FileContentsId(file.contentsId),
      path: new FilePath(file.path),
      size: new FileSize(file.size),
      folderId: new FileFolderId(file.folderId),
    });
  }
}
