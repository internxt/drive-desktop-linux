import { Service } from 'diod';
import { logger } from '@internxt/drive-desktop-core/build/backend';
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
import { runTrackingCreation } from './PendingFolderCreationTracker';
import { retryWithBackoff } from '../../../../../shared/retry-with-backoff';
import { createTransientErrorHandler } from '../../../../shared/application/transient-error-handler';

@Service()
export class FolderCreator {
  constructor(
    private readonly repository: FolderRepository,
    private readonly parentFolderFinder: ParentFolderFinder,
    private readonly remote: RemoteFileSystem,
    private readonly eventBus: EventBus,
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

  private async findParentId(path: FolderPath): Promise<FolderId> {
    const parent = await this.parentFolderFinder.run(path);
    return new FolderId(parent.id);
  }

  async run(path: string): Promise<void> {
    await runTrackingCreation({
      path,
      action: async () => {
        const folderPath = new FolderPath(path);

        await this.ensureItDoesNotExists(folderPath);
        const parent = await this.parentFolderFinder.run(folderPath);
        const parentId = await this.findParentId(folderPath);

        const response = await retryWithBackoff(
          async () => {
            const result = await this.remote.persist(folderPath.name(), parent.uuid);
            if (result.isLeft()) return { error: result.getLeft() };
            return { data: result.getRight() };
          },
          createTransientErrorHandler({ tag: 'SYNC-ENGINE', context: 'FOLDER CREATION RETRY', path: folderPath.value }),
          new AbortController().signal,
        );

        if (response.error) {
          const error = response.error;

          logger.error({
            msg: 'Error creating folder:',
            error,
          });

          if (error.cause === 'FILE_ALREADY_EXISTS') {
            const existingFolder = await this.remote.searchWith(parentId, folderPath);

            if (existingFolder) {
              await this.repository.add(existingFolder);
              return;
            }
          }

          throw new Error(`Could not create folder ${folderPath.value}: ${error.cause}`);
        }

        const dto = response.data;

        const folder = Folder.create(
          new FolderId(dto.id),
          new FolderUuid(dto.uuid),
          folderPath,
          parentId,
          FolderCreatedAt.fromString(dto.createdAt),
          FolderUpdatedAt.fromString(dto.updatedAt),
        );

        await this.repository.add(folder);

        const events = folder.pullDomainEvents();
        this.eventBus.publish(events);
      },
    });
  }
}
