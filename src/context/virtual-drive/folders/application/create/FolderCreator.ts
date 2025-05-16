import { Service } from 'diod';
import Logger from 'electron-log';
import { EventBus } from '../../../shared/domain/EventBus';
import { Folder } from '../../domain/Folder';
import { FolderCreatedAt } from '../../domain/FolderCreatedAt';
import { FolderId } from '../../domain/FolderId';
import { FolderPath } from '../../domain/FolderPath';
import { FolderRepository } from '../../domain/FolderRepository';
import { FolderStatuses } from '../../domain/FolderStatus';
import { FolderUpdatedAt } from '../../domain/FolderUpdatedAt';
import { FolderUuid } from '../../domain/FolderUuid';
import { FolderInPathAlreadyExistsError } from '../../domain/errors/FolderInPathAlreadyExistsError';
import { RemoteFileSystem } from '../../domain/file-systems/RemoteFileSystem';
import { ParentFolderFinder } from '../ParentFolderFinder';

@Service()
export class FolderCreator {
  constructor(
    private readonly repository: FolderRepository,
    private readonly parentFolderFinder: ParentFolderFinder,
    private readonly remote: RemoteFileSystem,
    private readonly eventBus: EventBus
  ) {}

  private async ensureItDoesNotExists(path: FolderPath): Promise<void> {
    const result = this.repository.matchingPartial({
      path: path.value,
      status: FolderStatuses.EXISTS,
    });

    if (result.length > 0) {
      throw new FolderInPathAlreadyExistsError(path);
    }
  }

  async run(path: string): Promise<void> {
    const folderPath = new FolderPath(path);

    await this.ensureItDoesNotExists(folderPath);
    const parent = await this.parentFolderFinder.run(folderPath);
    const parentId = new FolderId(parent.id);

    const response = await this.remote.persist(folderPath.name(), parentId, parent.uuid);

    if (response.isLeft()) {
      Logger.error(response.getLeft());
      return;
    }

    const dto = response.getRight();

    const folder = Folder.create(
      new FolderId(dto.id),
      new FolderUuid(dto.uuid),
      folderPath,
      parentId,
      FolderCreatedAt.fromString(dto.createdAt),
      FolderUpdatedAt.fromString(dto.updatedAt)
    );

    await this.repository.add(folder);

    const events = folder.pullDomainEvents();
    this.eventBus.publish(events);
  }
}
