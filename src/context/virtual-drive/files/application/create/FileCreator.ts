import { Service } from 'diod';
import { logger } from '@internxt/drive-desktop-core/build/backend';
import { basename } from 'path';
import { DriveDesktopError } from '../../../../shared/domain/errors/DriveDesktopError';
import { ParentFolderFinder } from '../../../folders/application/ParentFolderFinder';
import { EventBus } from '../../../shared/domain/EventBus';
import { File } from '../../domain/File';
import { FilePath } from '../../domain/FilePath';
import { FileRepository } from '../../domain/FileRepository';
import { FileSize } from '../../domain/FileSize';
import { SyncFileMessenger } from '../../domain/SyncFileMessenger';
import { RemoteFileSystem } from '../../domain/file-systems/RemoteFileSystem';
import { FileContentsId } from '../../domain/FileContentsId';
import { FileFolderId } from '../../domain/FileFolderId';
import { runAfterParentCreations } from '../../../folders/application/create/PendingFolderCreationTracker';
import { retryWithBackoff } from '../../../../../shared/retry-with-backoff';
import { createTransientErrorHandler } from '../../../../shared/application/transient-error-handler';

@Service()
export class FileCreator {
  constructor(
    private readonly remote: RemoteFileSystem,
    private readonly repository: FileRepository,
    private readonly parentFolderFinder: ParentFolderFinder,
    private readonly eventBus: EventBus,
    private readonly notifier: SyncFileMessenger,
  ) {}

  async run(path: string, contentsId: string, size: number): Promise<File> {
    try {
      const file = await runAfterParentCreations({
        path,
        action: async () => {
          const fileSize = new FileSize(size);
          const fileContentsId = new FileContentsId(contentsId);
          const filePath = new FilePath(path);

          const folder = await this.parentFolderFinder.run(filePath);
          const fileFolderId = new FileFolderId(folder.id);

          const { data: persistedFile, error: persistedError } = await retryWithBackoff(
            async () => {
              const either = await this.remote.persist({
                contentsId: fileContentsId,
                path: filePath,
                size: fileSize,
                folderId: fileFolderId,
                folderUuid: folder.uuid,
              });

              if (either.isLeft()) {
                return { error: either.getLeft() };
              }

              return { data: either.getRight() };
            },
            createTransientErrorHandler({ tag: 'SYNC-ENGINE', context: 'FILE CREATION RETRY', path: filePath.value }),
            new AbortController().signal,
          );

          if (persistedError) {
            throw persistedError;
          }

          const { modificationTime, id, uuid, createdAt } = persistedFile;

          return File.create({
            id,
            uuid,
            contentsId: fileContentsId.value,
            folderId: fileFolderId.value,
            createdAt,
            modificationTime,
            path: filePath.value,
            size: fileSize.value,
            updatedAt: modificationTime,
          });
        },
      });

      await this.repository.upsert(file);
      await this.eventBus.publish(file.pullDomainEvents());
      await this.notifier.created(file.name, file.type);

      return file;
    } catch (error: unknown) {
      logger.error({ msg: `[File Creator] Error creating file: ${path}`, error });

      const cause = error instanceof DriveDesktopError ? error.cause : 'UNKNOWN';

      await this.notifier.issues({
        error: 'UPLOAD_ERROR',
        cause,
        name: basename(path),
      });

      throw error;
    }
  }
}
