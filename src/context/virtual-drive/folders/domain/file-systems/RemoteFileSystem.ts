import { Either } from '../../../../shared/domain/Either';
import { DriveDesktopError } from '../../../../shared/domain/errors/DriveDesktopError';
import { Folder } from '../Folder';
import { FolderPath } from '../FolderPath';

export type FolderPersistedDto = {
  uuid: string;
  updatedAt: string;
  createdAt: string;
};

export abstract class RemoteFileSystem {
  abstract persist(plainName: string, parentFolderUuid: string): Promise<Either<DriveDesktopError, FolderPersistedDto>>;

  abstract searchWith(parentFolderUuid: string, folderPath: FolderPath): Promise<Folder | undefined>;
}
