import { Service } from 'diod';
import { RemoteFileSystem } from '../../domain/file-systems/RemoteFileSystem';
import { FolderPath } from '../../domain/FolderPath';
import { FolderId } from '../../domain/FolderId';
import { Folder } from '../../domain/Folder';
import { FolderUuid } from '../../domain/FolderUuid';
import { FolderCreatedAt } from '../../domain/FolderCreatedAt';
import { FolderUpdatedAt } from '../../domain/FolderUpdatedAt';
import { logger } from '@internxt/drive-desktop-core/build/backend';
import { persistFolderWithRetry } from './persist-folder-with-retry';

@Service()
export class SimpleFolderCreator {
  constructor(private readonly rfs: RemoteFileSystem) {}

  async run(path: string, parentId: number, parentUuid: string, signal?: AbortSignal): Promise<Folder> {
    const folderPath = new FolderPath(path);
    const folderParentId = new FolderId(parentId);

    const { data: dto, error } = await persistFolderWithRetry({
      remoteFileSystem: this.rfs,
      folderPath,
      parentUuid,
      tag: 'BACKUPS',
      context: 'BACKUP FOLDER CREATION RETRY',
      signal,
    });

    if (error) {
      logger.warn({
        msg: 'The folder was not been able to create',
        error,
      });

      if (error.cause === 'FILE_ALREADY_EXISTS') {
        const existingFolder = await this.rfs.searchWith(folderParentId, folderPath);
        if (existingFolder) {
          return existingFolder;
        }
      }
    }

    if (!dto) {
      throw new Error('Could not create folder and was not found either');
    }

    return Folder.create(
      new FolderId(dto.id),
      new FolderUuid(dto.uuid),
      folderPath,
      folderParentId,
      FolderCreatedAt.fromString(dto.createdAt),
      FolderUpdatedAt.fromString(dto.updatedAt),
    );
  }
}
