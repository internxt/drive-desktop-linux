import { Service } from 'diod';
import { RemoteFileSystem } from '../../domain/file-systems/RemoteFileSystem';
import { FolderPath } from '../../domain/FolderPath';
import { Folder } from '../../domain/Folder';
import { logger } from '@internxt/drive-desktop-core/build/backend';
import { persistFolderWithRetry } from './persist-folder-with-retry';

@Service()
export class SimpleFolderCreator {
  constructor(private readonly rfs: RemoteFileSystem) {}

  async run(path: string, parentUuid: string, signal?: AbortSignal): Promise<Folder> {
    const folderPath = new FolderPath(path);

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
      throw new Error(`Could not create folder ${folderPath.value}: ${error.cause}`);
    }

    return Folder.create({
      uuid: dto.uuid,
      path: folderPath.value,
      parentUuid,
      createdAt: dto.createdAt,
      updatedAt: dto.updatedAt,
    });
  }
}
