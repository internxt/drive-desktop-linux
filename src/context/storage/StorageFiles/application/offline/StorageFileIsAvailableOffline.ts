import { Service } from 'diod';
import { StorageFilesRepository } from '../../domain/StorageFilesRepository';
import { SingleFileMatchingFinder } from '../../../../virtual-drive/files/application/SingleFileMatchingFinder';
import { DriveItemStatus } from '@internxt/drive-desktop-core/build/backend';
import { StorageFileId } from '../../domain/StorageFileId';

@Service()
export class StorageFileIsAvailableOffline {
  constructor(
    private readonly virtualFileFinder: SingleFileMatchingFinder,
    private readonly repository: StorageFilesRepository,
  ) {}

  async run(path: string) {
    const virtual = await this.virtualFileFinder.run({
      path,
      status: DriveItemStatus.EXISTS,
    });

    if (virtual.size === 0) {
      return true;
    }

    const id = new StorageFileId(virtual.contentsId);

    return await this.repository.exists(id);
  }
}
