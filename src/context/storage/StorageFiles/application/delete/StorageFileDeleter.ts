import { Service } from 'diod';
import { SingleFileMatchingFinder } from '../../../../virtual-drive/files/application/SingleFileMatchingFinder';
import { DriveItemStatus } from '@internxt/drive-desktop-core/build/backend';
import { StorageFileId } from '../../domain/StorageFileId';
import { StorageFilesRepository } from '../../domain/StorageFilesRepository';

@Service()
export class StorageFileDeleter {
  constructor(
    private readonly repository: StorageFilesRepository,
    private readonly virtualFileFinder: SingleFileMatchingFinder,
  ) {}

  async run(path: string) {
    const virtual = await this.virtualFileFinder.run({
      path,
      status: DriveItemStatus.EXISTS,
    });

    const id = new StorageFileId(virtual.contentsId);

    const exists = await this.repository.exists(id);

    if (!exists) {
      return;
    }

    const file = await this.repository.retrieve(id);

    await this.repository.delete(file.id);
  }
}
