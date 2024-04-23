import { Container } from 'diod';
import Logger from 'electron-log';
import { FirstsFileSearcher } from '../../../context/virtual-drive/files/application/FirstsFileSearcher';
import { FuseCallback } from './FuseCallback';
import { FuseIOError, FuseNoSuchFileOrDirectoryError } from './FuseErrors';
import { DocumentByPathFinder } from '../../../context/offline-drive/documents/application/find/DocumentByPathFinder';
import { LocalFileIsAvailable } from '../../../context/offline-drive/LocalFile/application/find/LocalFileIsAvaliable';
import { Document } from '../../../context/offline-drive/documents/domain/Document';
import { File } from '../../../context/virtual-drive/files/domain/File';
import { FileDownloader } from '../../../context/virtual-drive/contents/application/FileDownloader';
import { LocalFileWriter } from '../../../context/offline-drive/LocalFile/application/write/LocalFileWriter';

export class OpenCallback extends FuseCallback<number> {
  constructor(private readonly container: Container) {
    super('Open');
  }

  private async searchForTemporalFiles(
    path: string
  ): Promise<Document | undefined> {
    const localIsAvaliable = await this.container
      .get(DocumentByPathFinder)
      .run(path);

    if (!localIsAvaliable) return;

    return await this.container.get(DocumentByPathFinder).run(path);
  }

  private async download(file: File) {
    const stream = await this.container.get(FileDownloader).run(file);

    await this.container.get(LocalFileWriter).run(file.contentsId, stream);
  }

  async execute(path: string, _flags: Array<any>) {
    try {
      const virtualFile = await this.container
        .get(FirstsFileSearcher)
        .run({ path });

      if (!virtualFile) {
        const document = await this.searchForTemporalFiles(path);

        if (document) {
          return this.right(0);
        }

        return this.left(new FuseNoSuchFileOrDirectoryError(path));
      }

      const localIsAvaliable = await this.container
        .get(LocalFileIsAvailable)
        .run(virtualFile.contentsId);

      if (localIsAvaliable) {
        return this.right(0);
      }

      await this.download(virtualFile);

      return this.right(0);
    } catch (err: unknown) {
      Logger.error('Error downloading file: ', err);
      if (err instanceof Error) {
        return this.left(new FuseIOError());
      }
      return this.left(new FuseIOError());
    }
  }
}
