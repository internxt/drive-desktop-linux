import { Service } from 'diod';
import { EventBus } from '../../shared/domain/EventBus';
import { Folder } from '../domain/Folder';
import { FolderPath } from '../domain/FolderPath';
import { FolderRepository } from '../domain/FolderRepository';
import { SyncFolderMessenger } from '../domain/SyncFolderMessenger';
import { driveServerModule } from '../../../../infra/drive-server/drive-server.module';

@Service()
export class FolderRenamer {
  constructor(
    private readonly repository: FolderRepository,
    private readonly eventBus: EventBus,
    private readonly syncFolderMessenger: SyncFolderMessenger
  ) {}

  async run(folder: Folder, destination: FolderPath) {
    this.syncFolderMessenger.rename(folder.name, destination.name());

    const nameBeforeRename = folder.name;

    folder.rename(destination);

    await driveServerModule.folders.renameFolder({
      uuid: folder.uuid,
      plainName: folder.name,
    });
    await this.repository.update(folder);

    this.eventBus.publish(folder.pullDomainEvents());
    this.syncFolderMessenger.renamed(nameBeforeRename, folder.name);
  }
}
