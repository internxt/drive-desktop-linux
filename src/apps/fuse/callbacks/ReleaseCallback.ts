import { Container } from 'diod';
import { OfflineContentsCacheCleaner } from '../../../context/offline-drive/contents/application/OfflineContentsCacheCleaner';
import { DocumentByPathFinder } from '../../../context/offline-drive/documents/application/find/DocumentByPathFinder';
import { DocumentUploader } from '../../../context/offline-drive/documents/application/upload/DocumentUploader';
import { FirstsFileSearcher } from '../../../context/virtual-drive/files/application/FirstsFileSearcher';
import { RelativePathToAbsoluteConverter } from '../../../context/virtual-drive/shared/application/RelativePathToAbsoluteConverter';
import { NotifyFuseCallback } from './FuseCallback';
import { FuseIOError } from './FuseErrors';
import Logger from 'electron-log';

export class ReleaseCallback extends NotifyFuseCallback {
  constructor(private readonly container: Container) {
    super('Release', { debug: false });
  }

  async execute(path: string, _fd: number) {
    try {
      const document = await this.container.get(DocumentByPathFinder).run(path);

      if (document) {
        this.logDebugMessage('Offline File found');
        if (document.size.value === 0) {
          this.logDebugMessage('Offline File Size is 0');
          return this.right();
        }

        if (document.isAuxiliary()) {
          this.logDebugMessage('Offline File is Auxiliary');
          return this.right();
        }

        await this.container.get(DocumentUploader).run(document.path.value);
        this.logDebugMessage('Offline File has been uploaded');
        return this.right();
      }

      const virtualFile = await this.container.get(FirstsFileSearcher).run({
        path,
      });

      if (virtualFile) {
        this.logDebugMessage('Virtual File founded');
        const contentsPath = this.container
          .get(RelativePathToAbsoluteConverter)
          .run(virtualFile.contentsId);

        await this.container.get(OfflineContentsCacheCleaner).run(contentsPath);

        return this.right();
      }

      this.logDebugMessage(`File with ${path} not found`);
      return this.right();
    } catch (err: unknown) {
      Logger.error(err);
      return this.left(new FuseIOError());
    }
  }
}
