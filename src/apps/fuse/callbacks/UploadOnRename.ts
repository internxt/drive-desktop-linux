import { FileStatuses } from '../../../context/virtual-drive/files/domain/FileStatus';
import { Either, right } from '../../../context/shared/domain/Either';
import { FuseError } from './FuseErrors';
import Logger from 'electron-log';
import { File } from '../../../context/virtual-drive/files/domain/File';
import { Container } from 'diod';
import { FirstsFileSearcher } from '../../../context/virtual-drive/files/application/FirstsFileSearcher';
import { RelativePathToAbsoluteConverter } from '../../../context/virtual-drive/shared/application/RelativePathToAbsoluteConverter';
import { DocumentUploader } from '../../../context/offline-drive/documents/application/upload/DocumentUploader';
import { DocumentByPathFinder } from '../../../context/offline-drive/documents/application/find/DocumentByPathFinder';
import { Document } from '../../../context/offline-drive/documents/domain/Document';
import { DocumentByteByByteComparator } from '../../../context/offline-drive/documents/application/comparation/DocumentByteByByteComparator';
import { DocumentPath } from '../../../context/offline-drive/documents/domain/DocumentPath';

type Result = 'no-op' | 'success';

export class UploadOnRename {
  private static readonly NO_OP: Result = 'no-op';
  private static readonly SUCCESS: Result = 'success';
  constructor(private readonly container: Container) {}

  private async differs(virtual: File, document: Document): Promise<boolean> {
    if (virtual.size !== document.size.value) {
      return true;
    }

    try {
      const filePath = this.container
        .get(RelativePathToAbsoluteConverter)
        .run(virtual.contentsId);

      const areEqual = await this.container
        .get(DocumentByteByByteComparator)
        .run(new DocumentPath(filePath), document.path);

      Logger.info(`Contents of <${virtual.path}> did not change`);

      return !areEqual;
    } catch (err) {
      Logger.error(err);
    }

    return false;
  }

  async run(src: string, dest: string): Promise<Either<FuseError, Result>> {
    const fileToOverride = await this.container.get(FirstsFileSearcher).run({
      path: dest,
      status: FileStatuses.EXISTS,
    });

    if (!fileToOverride) {
      Logger.debug('[UPLOAD ON RENAME] file to override not found', dest);
      return right(UploadOnRename.NO_OP);
    }

    const document = await this.container.get(DocumentByPathFinder).run(src);

    if (!document) {
      Logger.debug('[UPLOAD ON RENAME] offline file not found', src);
      return right(UploadOnRename.NO_OP);
    }

    const differs = await this.differs(fileToOverride, document);

    if (!differs) {
      return right(UploadOnRename.SUCCESS);
    }

    await this.container.get(DocumentUploader).run(document.path.value, {
      contentsId: fileToOverride.contentsId,
      name: fileToOverride.name,
      extension: fileToOverride.type,
    });

    return right(UploadOnRename.SUCCESS);
  }
}
