import { Service } from 'diod';
import { EventBus } from '../../../shared/domain/EventBus';
import { Folder } from '../../domain/Folder';
import { FolderPath } from '../../domain/FolderPath';
import { FolderRepository } from '../../domain/FolderRepository';
import { OfflineFolder } from '../../domain/OfflineFolder';
import { SyncFolderMessenger } from '../../domain/SyncFolderMessenger';
import { RemoteFileSystem } from '../../domain/file-systems/RemoteFileSystem';

@Service()
export class FolderCreatorFromOfflineFolder {
  constructor(
    private readonly repository: FolderRepository,
    private readonly remote: RemoteFileSystem,
    private readonly eventBus: EventBus,
    private readonly syncFolderMessenger: SyncFolderMessenger,
  ) {}

  async run(offlineFolder: OfflineFolder): Promise<Folder> {
    this.syncFolderMessenger.creating(offlineFolder.name);

    const either = await this.remote.persist(new FolderPath(offlineFolder.path).name(), offlineFolder.parentUuid);

    if (either.isLeft()) {
      return Promise.reject(either.getLeft());
    }

    const dto = either.getRight();

    const folder = Folder.create({
      uuid: dto.uuid,
      path: offlineFolder.path,
      parentUuid: offlineFolder.parentUuid,
      createdAt: dto.createdAt,
      updatedAt: dto.updatedAt,
    });

    await this.repository.add(folder);

    const events = folder.pullDomainEvents();
    this.eventBus.publish(events);

    this.syncFolderMessenger.created(offlineFolder.name);

    return folder;
  }
}
