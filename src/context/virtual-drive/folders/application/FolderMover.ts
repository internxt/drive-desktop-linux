import { Service } from 'diod';
import { Folder } from '../domain/Folder';
import { FolderPath } from '../domain/FolderPath';
import { FolderRepository } from '../domain/FolderRepository';
import { FolderStatuses } from '../domain/FolderStatus';
import { ActionNotPermittedError } from '../domain/errors/ActionNotPermittedError';
import { ParentFolderFinder } from './ParentFolderFinder';
import { driveServerModule } from '../../../../infra/drive-server/drive-server.module';

@Service()
export class FolderMover {
  constructor(
    private readonly repository: FolderRepository,
    private readonly fileParentFolderFinder: ParentFolderFinder
  ) {}

  private async move(folder: Folder, parentFolder: Folder) {
    folder.moveTo(parentFolder);

    await driveServerModule.folders.moveFolder({
      uuid: folder.uuid,
      destinationFolder: parentFolder.uuid,
    });
    await this.repository.update(folder);
  }

  async run(folder: Folder, destination: FolderPath): Promise<void> {
    const resultFolder = this.repository.matchingPartial({
      path: destination.value,
      status: FolderStatuses.EXISTS,
    });

    const shouldBeMerge = resultFolder.length > 0;

    if (shouldBeMerge) {
      throw new ActionNotPermittedError('overwrite');
    }

    const destinationFolder = await this.fileParentFolderFinder.run(
      destination
    );

    await this.move(folder, destinationFolder);
  }
}
