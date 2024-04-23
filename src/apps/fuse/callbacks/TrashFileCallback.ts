import { Container } from 'diod';
import { FileDeleter } from '../../../context/virtual-drive/files/application/FileDeleter';
import { FirstsFileSearcher } from '../../../context/virtual-drive/files/application/FirstsFileSearcher';
import { FileStatuses } from '../../../context/virtual-drive/files/domain/FileStatus';
import { NotifyFuseCallback } from './FuseCallback';
import { FuseIOError, FuseNoSuchFileOrDirectoryError } from './FuseErrors';
import { TemporalFileByPathFinder } from '../../../context/offline-drive/TemporalFiles/application/find/TemporalFileByPathFinder';
import { TemporalFileDeleter } from '../../../context/offline-drive/TemporalFiles/application/deletion/TemporalFileDeleter';

export class TrashFileCallback extends NotifyFuseCallback {
  constructor(private readonly container: Container) {
    super('Trash file');
  }

  async execute(path: string) {
    const file = await this.container.get(FirstsFileSearcher).run({
      path,
      status: FileStatuses.EXISTS,
    });

    if (!file) {
      const document = await this.container
        .get(TemporalFileByPathFinder)
        .run(path);

      if (!document) {
        return this.left(new FuseNoSuchFileOrDirectoryError(path));
      }

      await this.container.get(TemporalFileDeleter).run(path);

      return this.right();
    }

    try {
      await this.container.get(FileDeleter).run(file.contentsId);

      return this.right();
    } catch {
      return this.left(new FuseIOError());
    }
  }
}
