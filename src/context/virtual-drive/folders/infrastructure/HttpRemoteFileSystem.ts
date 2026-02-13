import { Axios } from 'axios';
import { Service } from 'diod';
import { logger } from '@internxt/drive-desktop-core/build/backend';
import { Either, left, right } from '../../../shared/domain/Either';
import { ServerFolder } from '../../../shared/domain/ServerFolder';
import { Folder } from '../domain/Folder';
import { FolderId } from '../domain/FolderId';
import { FolderPath } from '../domain/FolderPath';
import { FolderPersistedDto, RemoteFileSystem, RemoteFileSystemErrors } from '../domain/file-systems/RemoteFileSystem';
import { mapToFolderPersistedDto } from '../../utils/map-to-folder-persisted-dto';
import { moveFolderIPC, renameFolderIPC } from '../../../../infra/ipc/folders-ipc';
import { createFolder } from '../../../../infra/drive-server/services/folder/services/create-folder';

type NewServerFolder = Omit<ServerFolder, 'plain_name'> & { plainName: string };

@Service()
export class HttpRemoteFileSystem implements RemoteFileSystem {
  private static PAGE_SIZE = 50;
  public folders: Record<string, Folder> = {};

  constructor(
    private readonly trashClient: Axios,
    private readonly maxRetries: number = 3,
  ) {}

  async searchWith(parentId: FolderId, folderPath: FolderPath): Promise<Folder | undefined> {
    let page = 0;
    const folders: Array<NewServerFolder> = [];
    let lastNumberOfFolders = 0;

    do {
      const offset = page * HttpRemoteFileSystem.PAGE_SIZE;

      // eslint-disable-next-line no-await-in-loop
      const result = await this.trashClient.get(
        `${process.env.NEW_DRIVE_URL}/folders/${parentId.value}/folders?offset=${offset}&limit=${HttpRemoteFileSystem.PAGE_SIZE}`,
      );

      const founded = result.data.result as Array<NewServerFolder>;
      folders.push(...founded);
      lastNumberOfFolders = founded.length;

      page++;
    } while (folders.length % HttpRemoteFileSystem.PAGE_SIZE === 0 && lastNumberOfFolders > 0);

    const name = folderPath.name();

    const folder = folders.find((folder) => folder.plainName === name);

    if (!folder) return;

    return Folder.from({
      ...folder,
      path: folderPath.value,
    });
  }

  async persist(
    plainName: string,
    parentFolderUuid: string,
    attempt = 0,
  ): Promise<Either<RemoteFileSystemErrors, FolderPersistedDto>> {
    const { data, error } = await createFolder({ parentFolderUuid, plainName });
    if (data) {
      return right(mapToFolderPersistedDto(data));
    }
    if (error) {
      if (error.cause === 'BAD_REQUEST' && attempt < this.maxRetries) {
        logger.debug({ msg: 'Folder Creation failed with code 400' });
        await new Promise((resolve) => {
          setTimeout(resolve, 1_000);
        });
        logger.debug({ msg: 'Retrying' });
        return this.persist(plainName, parentFolderUuid, attempt + 1);
      }
      if (error.cause === 'BAD_REQUEST') {
        return left('WRONG_DATA');
      }
      if (error.cause === 'CONFLICT') {
        return left('ALREADY_EXISTS');
      }
    }
    return left('UNHANDLED');
  }

  async trash(id: Folder['id']): Promise<void> {
    const result = await this.trashClient.post(`${process.env.NEW_DRIVE_URL}/storage/trash/add`, {
      items: [{ type: 'folder', id }],
    });

    if (result.status !== 200) {
      logger.error({
        msg: '[FOLDER FILE SYSTEM] Folder deletion failed with status:',
        status: result.status,
        statusText: result.statusText,
      });

      throw new Error('Error when deleting folder');
    }
  }

  async rename(folder: Folder): Promise<void> {
    const response = await renameFolderIPC(folder.uuid, folder.name);

    if (response.error) {
      throw new Error(`[FOLDER FILE SYSTEM] Error updating item metadata: ${response.error.message}`);
    }
  }
}
