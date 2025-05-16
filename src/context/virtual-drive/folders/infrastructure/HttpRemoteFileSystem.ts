import axios, { Axios } from 'axios';
import { Service } from 'diod';
import Logger from 'electron-log';
import { Either, left, right } from '../../../shared/domain/Either';
import { ServerFolder } from '../../../shared/domain/ServerFolder';
import { Folder } from '../domain/Folder';
import { FolderId } from '../domain/FolderId';
import { FolderPath } from '../domain/FolderPath';
import {
  FolderPersistedDto,
  RemoteFileSystem,
  RemoteFileSystemErrors,
} from '../domain/file-systems/RemoteFileSystem';
import { driveServerModule } from '../../../../infra/drive-server/drive-server.module';
import { mapToFolderPersistedDto } from '../../utils/mapper';

type NewServerFolder = Omit<ServerFolder, 'plain_name'> & { plainName: string };

@Service()
export class HttpRemoteFileSystem implements RemoteFileSystem {
  private static PAGE_SIZE = 50;
  public folders: Record<string, Folder> = {};

  constructor(
    private readonly trashClient: Axios,
    private readonly maxRetries: number = 3
  ) {}

  async searchWith(
    parentId: FolderId,
    folderPath: FolderPath
  ): Promise<Folder | undefined> {
    let page = 0;
    const folders: Array<NewServerFolder> = [];
    let lastNumberOfFolders = 0;

    do {
      const offset = page * HttpRemoteFileSystem.PAGE_SIZE;

      // eslint-disable-next-line no-await-in-loop
      const result = await this.trashClient.get(
        `${process.env.NEW_DRIVE_URL}/folders/${parentId.value}/folders?offset=${offset}&limit=${HttpRemoteFileSystem.PAGE_SIZE}`
      );

      const founded = result.data.result as Array<NewServerFolder>;
      folders.push(...founded);
      lastNumberOfFolders = founded.length;

      page++;
    } while (
      folders.length % HttpRemoteFileSystem.PAGE_SIZE === 0 &&
      lastNumberOfFolders > 0
    );

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
    parentId: FolderId,
    parentFolderUuid: string,
    attempt = 0
  ): Promise<Either<RemoteFileSystemErrors, FolderPersistedDto>> {
    try {
      const res2 = await driveServerModule.folders.createFolder({
        plainName,
        parentFolderUuid,
      });

      if (res2.isRight()) {
        return right(mapToFolderPersistedDto(res2.getRight()));
      } else {
        const error = res2.getLeft();
        if (axios.isAxiosError(error.cause)) {
          if (error.cause.status !== 201) {
            throw new Error('Folder creation failed');
          }
        }
        throw error;
      }
    } catch (err) {
      if (err instanceof Error && axios.isAxiosError(err.cause)) {
        const { status } = err.cause;

        if (status === 400 && attempt < this.maxRetries) {
          Logger.debug('Folder Creation failed with code 400');
          await new Promise((resolve) => {
            setTimeout(resolve, 1_000);
          });
          Logger.debug('Retrying');
          return this.persist(plainName, parentId, parentFolderUuid, attempt + 1);
        }

        if (status === 400) {
          return left('WRONG_DATA');
        }

        if (status === 409) {
          return left('ALREADY_EXISTS');
        }
      }
      return left('UNHANDLED');
    }
  }

  /* @Deprecated use driveServerModule.folders.addFolderToTrash instead */
  async trash(): Promise<void> {
    /* no-op */
  }

  /* @Deprecated use driveServerModule.folders.renameFolder instead */
  async rename(): Promise<void> {
    /* no-op */
  }

  /* @Deprecated use driveServerModule.folders.moveFolder instead */
  async move(): Promise<void> {
    /* no-op */
  }
}
